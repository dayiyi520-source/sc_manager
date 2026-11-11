import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.setup_production_mock import initialize_shared_data


class SharedMockInitializationTests(unittest.TestCase):
    def test_preserves_existing_online_data_and_initializes_only_missing_file(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shared = root / 'shared'
            incoming = root / 'release' / 'mock-data'
            shared.mkdir()
            incoming.mkdir(parents=True)
            original = b'{"revision":292,"okrRecords":[{"id":"online"}]}\n'
            (shared / 'okr-state.json').write_bytes(original)
            (incoming / 'okr-state.json').write_text('{"revision":119,"okrRecords":[]}', encoding='utf-8')
            (incoming / 'research-template.json').write_text('{"productLines":[{"id":"seed"}]}', encoding='utf-8')
            with patch('scripts.setup_production_mock.os.chown', create=True), patch('scripts.setup_production_mock.os.chmod'):
                initialize_shared_data(shared, root / 'release', 1, 1)
            self.assertEqual((shared / 'okr-state.json').read_bytes(), original)
            self.assertEqual(json.loads((shared / 'research-template.json').read_text(encoding='utf-8'))['productLines'][0]['id'], 'seed')

    def test_rejects_invalid_existing_file_without_overwriting_it(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shared = root / 'shared'
            shared.mkdir()
            (shared / 'okr-state.json').write_text('{broken', encoding='utf-8')
            with self.assertRaises(json.JSONDecodeError):
                initialize_shared_data(shared, root / 'release', 1, 1)
            self.assertEqual((shared / 'okr-state.json').read_text(encoding='utf-8'), '{broken')


if __name__ == '__main__':
    unittest.main()
