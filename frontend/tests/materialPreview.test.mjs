import test from 'node:test';
import assert from 'node:assert/strict';
import { materialFormat, materialPreviewUrl } from '../src/services/materialPreview.js';

test('Word and PowerPoint View URLs open the embedded viewer instead of the raw download', () => {
  for (const extension of ['doc', 'docx', 'ppt', 'pptx']) {
    const file_url = `https://backend.example/storage/lesson/file.${extension}?version=1&name=Chapter%201`;
    const material = { type: 'other', file_url };
    assert.equal(materialFormat(material), extension);
    const preview = new URL(materialPreviewUrl(material));
    assert.equal(preview.hostname, 'docs.google.com');
    assert.equal(preview.searchParams.get('url'), file_url);
    assert.equal(preview.searchParams.get('embedded'), 'true');
  }
});

test('PDFs and explicit links retain their original preview URL', () => {
  assert.equal(materialPreviewUrl({ type: 'pdf', file_url: 'https://backend.example/source.pdf' }), 'https://backend.example/source.pdf');
  assert.equal(materialPreviewUrl({ type: 'link', url: 'https://example.com/lesson.docx' }), 'https://example.com/lesson.docx');
  assert.equal(materialPreviewUrl({ type: 'docx' }), null);
});
