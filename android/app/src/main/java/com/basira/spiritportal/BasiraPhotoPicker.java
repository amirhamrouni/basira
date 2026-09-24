package com.basira.spiritportal;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.provider.MediaStore;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.media.ExifInterface;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

@CapacitorPlugin(name = "BasiraPhotoPicker")
public class BasiraPhotoPicker extends Plugin {
    private static final String PREFS = "basira_photo_picker";
    private static final String CAMERA_FILE = "camera_file";

    @PluginMethod
    public void pickPhoto(PluginCall call) {
        String source = call.getString("source", "gallery");
        try {
            if ("camera".equals(source)) {
                File file = File.createTempFile("basira_camera_", ".jpg", getContext().getCacheDir());
                getContext().getSharedPreferences(PREFS, 0).edit().putString(CAMERA_FILE, file.getAbsolutePath()).apply();
                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
                Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                intent.putExtra(MediaStore.EXTRA_OUTPUT, uri);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                startActivityForResult(call, intent, "photoResult");
            } else {
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.setType("image/*");
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                startActivityForResult(call, intent, "photoResult");
            }
        } catch (Exception e) {
            call.reject("Could not open camera or gallery", e);
        }
    }

    @ActivityCallback
    private void photoResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK) {
            call.resolve(new JSObject());
            return;
        }
        try {
            File file;
            if ("camera".equals(call.getString("source"))) {
                String path = getContext().getSharedPreferences(PREFS, 0).getString(CAMERA_FILE, null);
                if (path == null) throw new IllegalStateException("Camera image missing");
                file = new File(path);
                if (!file.isFile() || file.length() == 0) throw new IllegalStateException("Camera image empty");
            } else {
                Intent data = result.getData();
                Uri uri = data == null ? null : data.getData();
                if (uri == null) throw new IllegalStateException("Gallery image missing");
                file = File.createTempFile("basira_gallery_", ".jpg", getContext().getCacheDir());
                try (InputStream input = getContext().getContentResolver().openInputStream(uri);
                     FileOutputStream output = new FileOutputStream(file)) {
                    if (input == null) throw new IllegalStateException("Gallery image unavailable");
                    byte[] buffer = new byte[16384];
                    int count;
                    while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                }
            }
            File reduced = reduceImage(file);
            JSObject response = new JSObject();
            response.put("uri", Uri.fromFile(reduced).toString());
            call.resolve(response);
        } catch (Exception e) {
            call.reject("Could not read selected image", e);
        }
    }

    private File reduceImage(File original) throws Exception {
        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(original.getAbsolutePath(), bounds);
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) throw new IllegalStateException("Unsupported image");
        BitmapFactory.Options options = new BitmapFactory.Options();
        options.inSampleSize = 1;
        while (Math.max(bounds.outWidth / options.inSampleSize, bounds.outHeight / options.inSampleSize) > 1800) {
            options.inSampleSize *= 2;
        }
        Bitmap bitmap = BitmapFactory.decodeFile(original.getAbsolutePath(), options);
        if (bitmap == null) throw new IllegalStateException("Image decode failed");
        try {
            int orientation = new ExifInterface(original.getAbsolutePath()).getAttributeInt(
                ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
            Matrix matrix = new Matrix();
            if (orientation == ExifInterface.ORIENTATION_ROTATE_90) matrix.postRotate(90);
            else if (orientation == ExifInterface.ORIENTATION_ROTATE_180) matrix.postRotate(180);
            else if (orientation == ExifInterface.ORIENTATION_ROTATE_270) matrix.postRotate(270);
            else if (orientation == ExifInterface.ORIENTATION_FLIP_HORIZONTAL) matrix.postScale(-1, 1);
            Bitmap upright = matrix.isIdentity() ? bitmap : Bitmap.createBitmap(bitmap, 0, 0, bitmap.getWidth(), bitmap.getHeight(), matrix, true);
            try {
                File output = File.createTempFile("basira_reading_", ".jpg", getContext().getCacheDir());
                try (FileOutputStream stream = new FileOutputStream(output)) {
                    if (!upright.compress(Bitmap.CompressFormat.JPEG, 82, stream)) throw new IllegalStateException("Image encoding failed");
                }
                return output;
            } finally {
                if (upright != bitmap) upright.recycle();
            }
        } finally {
            bitmap.recycle();
        }
    }
}
