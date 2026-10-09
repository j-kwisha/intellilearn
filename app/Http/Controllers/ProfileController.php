<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\{DB, Log, Storage};
use App\Models\User;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    /**
     * UPDATE PROFILE
     * PUT /api/profile
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'first_name' => ['sometimes', 'string', 'max:255'],
            'last_name'  => ['sometimes', 'string', 'max:255'],
            'email'      => ['sometimes', 'email', 'unique:users,email,' . $user->id],
            'avatar' => ['bail', 'nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'mimetypes:image/jpeg,image/png,image/webp', 'max:5120',
                function ($attribute, $file, $fail) {
                    $image = @getimagesize($file->getRealPath());
                    if (!$image || !in_array($image[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) {
                        $fail('Upload a readable JPG, PNG, or WebP image.');
                    }
                }],
            'remove_avatar' => ['sometimes', 'boolean'],
        ]);

        if ($request->hasFile('avatar') && $request->boolean('remove_avatar')) {
            throw ValidationException::withMessages(['avatar' => 'Choose a photo to upload or remove the current photo, not both.']);
        }
        $disk = Storage::disk('public');
        $newPath = null;
        $oldAvatar = null;
        try {
            if ($request->hasFile('avatar')) {
                $newPath = $request->file('avatar')->store('avatars/user_'.$user->id, 'public');
                if (!$newPath) throw new \RuntimeException('Photo storage failed');
            }
            $user = DB::transaction(function () use ($user, $validated, $request, $disk, $newPath, &$oldAvatar) {
                $account = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
                $changes = array_intersect_key($validated, array_flip(['first_name', 'last_name', 'email']));
                if ($newPath || $request->boolean('remove_avatar')) {
                    $oldAvatar = $account->avatar;
                    $changes['avatar'] = $newPath ? $disk->url($newPath) : null;
                }
                $account->update($changes);
                return $account;
            });
        } catch (\Throwable $e) {
            if ($newPath) $this->deletePhoto($disk, $newPath);
            Log::error('Profile update failed', ['user_id' => $user->id, 'exception_type' => get_class($e)]);
            return response()->json(['message' => 'Could not save your profile. Please try again.'], 503);
        }
        // Never delete a Google photo or another user's file. Delete only our owned upload after saving.
        if ($oldAvatar) {
            $prefix = $disk->url('avatars/user_'.$user->id.'/');
            if (str_starts_with($oldAvatar, $prefix)) {
                $filename = substr($oldAvatar, strlen($prefix));
                if (preg_match('/^[a-zA-Z0-9]+\.(jpg|jpeg|png|webp)$/', $filename)) {
                    $this->deletePhoto($disk, 'avatars/user_'.$user->id.'/'.$filename);
                }
            }
        }

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user'    => $user->only(['id', 'first_name', 'last_name', 'email', 'role', 'avatar']),
        ]);
    }

    private function deletePhoto($disk, string $path): void
    {
        try { $disk->delete($path); }
        catch (\Throwable $e) { Log::warning('Profile photo cleanup failed', ['exception_type' => get_class($e)]); }
    }

    /**
     * CHANGE PASSWORD
     * PUT /api/profile/password
     */
    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'current_password' => ['required', 'string'],
            'password'         => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (! Hash::check($request->current_password, $user->password ?? '')) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $user->update(['password' => $request->password]);

        return response()->json(['message' => 'Password changed successfully.']);
    }
}
