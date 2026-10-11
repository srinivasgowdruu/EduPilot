import io
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

os.environ.setdefault('GEMINI_API_KEY', 'test-gemini-key')
os.environ.setdefault('YOUTUBE_API_KEY', 'test-youtube-key')

from app import app


class UploadRouteTests(unittest.TestCase):
    def setUp(self):
        app.config.update(TESTING=True)
        self.client = app.test_client()

    def test_upload_txt_file_returns_extracted_text(self):
        payload = {
            'file': (io.BytesIO(b'hello from uploaded file'), 'sample.txt')
        }

        response = self.client.post(
            '/api/upload-file',
            data=payload,
            content_type='multipart/form-data'
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('hello from uploaded file', response.get_json()['notes'])

    @patch('app.generate_gemini_content')
    def test_upload_generates_notes_and_saves_session(self, mock_generate_gemini_content):
        mock_generate_gemini_content.side_effect = ['Generated notes', 'Generated summary']
        payload = {
            'file': (io.BytesIO(b'hello from uploaded file'), 'sample.txt')
        }

        response = self.client.post(
            '/api/upload-file',
            data=payload,
            content_type='multipart/form-data'
        )

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['notes'], 'Generated notes')
        self.assertEqual(data['summary'], 'Generated summary')
        self.assertIsNotNone(data['session_id'])

    @patch('app.generate_gemini_content')
    def test_upload_uses_clear_simple_language_prompts(self, mock_generate_gemini_content):
        mock_generate_gemini_content.side_effect = ['Generated notes', 'Generated summary']
        payload = {
            'file': (io.BytesIO(b'hello from uploaded file'), 'sample.txt')
        }

        self.client.post(
            '/api/upload-file',
            data=payload,
            content_type='multipart/form-data'
        )

        self.assertEqual(mock_generate_gemini_content.call_count, 2)
        notes_prompt = mock_generate_gemini_content.call_args_list[0].args[0]
        summary_prompt = mock_generate_gemini_content.call_args_list[1].args[0]

        self.assertIn('easy to understand', notes_prompt.lower())
        self.assertIn('plain language', notes_prompt.lower())
        self.assertIn('simple', summary_prompt.lower())


if __name__ == '__main__':
    unittest.main()
