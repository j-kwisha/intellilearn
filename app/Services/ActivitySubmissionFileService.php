<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/** Keeps student work encrypted on the existing persistent public-storage volume. */
class ActivitySubmissionFileService
{
    private const MAGIC = 'IAF1';
    private const CHUNK_SIZE = 1048576;

    public function store(UploadedFile $file, int $assessmentId, int $studentId): string
    {
        $source = fopen($file->getRealPath(), 'rb');
        $encrypted = tmpfile();
        if (!$source || !$encrypted) throw new RuntimeException('Could not prepare the activity file.');
        $path = "activity-submissions/assessment_{$assessmentId}/student_{$studentId}/" . bin2hex(random_bytes(16)) . '.enc';
        try {
            $this->writeAll($encrypted, self::MAGIC);
            $index = 0;
            while (!feof($source)) {
                $chunk = fread($source, self::CHUNK_SIZE);
                if ($chunk === false) throw new RuntimeException('Could not read the submitted file.');
                if ($chunk !== '') $this->writeFrame($encrypted, $chunk, $index++, false);
            }
            $this->writeFrame($encrypted, '', $index, true);
            rewind($encrypted);
            if (!Storage::disk('public')->put($path, $encrypted)) {
                throw new RuntimeException('Could not store the activity file.');
            }
            return $path;
        } catch (\Throwable $error) {
            Storage::disk('public')->delete($path);
            throw $error;
        } finally {
            fclose($source);
            fclose($encrypted);
        }
    }

    public function stream(string $path): void
    {
        $source = Storage::disk('public')->readStream($path);
        if (!$source) throw new RuntimeException('Activity file is missing.');
        try {
            if ($this->readExactly($source, 4) !== self::MAGIC) throw new RuntimeException('Activity file is invalid.');
            $index = 0;
            while (true) {
                $length = unpack('N', $this->readExactly($source, 4))[1];
                if ($length > self::CHUNK_SIZE) throw new RuntimeException('Activity file is invalid.');
                $nonce = $this->readExactly($source, 12);
                $tag = $this->readExactly($source, 16);
                $ciphertext = $this->readExactly($source, $length);
                $final = $length === 0;
                $plain = openssl_decrypt($ciphertext, 'aes-256-gcm', $this->key(), OPENSSL_RAW_DATA,
                    $nonce, $tag, pack('N', $index) . ($final ? 'F' : 'D'));
                if ($plain === false || strlen($plain) !== $length) throw new RuntimeException('Activity file failed integrity check.');
                if ($final) {
                    if (fread($source, 1) !== '') throw new RuntimeException('Activity file has trailing data.');
                    break;
                }
                echo $plain;
                $index++;
            }
        } finally {
            fclose($source);
        }
    }

    private function writeFrame($output, string $plain, int $index, bool $final): void
    {
        $nonce = random_bytes(12);
        $tag = '';
        $ciphertext = openssl_encrypt($plain, 'aes-256-gcm', $this->key(), OPENSSL_RAW_DATA,
            $nonce, $tag, pack('N', $index) . ($final ? 'F' : 'D'));
        if ($ciphertext === false) {
            throw new RuntimeException('Could not encrypt the activity file.');
        }
        $this->writeAll($output, pack('N', strlen($plain)) . $nonce . $tag . $ciphertext);
    }

    private function key(): string
    {
        $appKey = config('app.key');
        if (!$appKey) throw new RuntimeException('Application encryption key is not configured.');
        if (str_starts_with($appKey, 'base64:')) $appKey = base64_decode(substr($appKey, 7), true);
        if (!$appKey) throw new RuntimeException('Application encryption key is invalid.');
        return hash_hmac('sha256', 'intellilearn-activity-file-v1', $appKey, true);
    }

    private function readExactly($stream, int $length): string
    {
        $bytes = '';
        while (strlen($bytes) < $length) {
            $part = fread($stream, $length - strlen($bytes));
            if ($part === false || $part === '') throw new RuntimeException('Activity file is truncated.');
            $bytes .= $part;
        }
        return $bytes;
    }

    private function writeAll($stream, string $bytes): void
    {
        $offset = 0;
        while ($offset < strlen($bytes)) {
            $written = fwrite($stream, substr($bytes, $offset));
            if ($written === false || $written === 0) throw new RuntimeException('Could not write encrypted activity file.');
            $offset += $written;
        }
    }
}
