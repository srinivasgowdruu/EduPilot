import importlib


app_module = importlib.import_module('app')


def test_extract_json_payload_from_list_with_surrounding_text():
    raw_response = '''
    Sure — here is the quiz:
    ```json
    [
      {
        "question": "What is the main idea?",
        "options": ["A", "B", "C", "D"],
        "correct_answer": "A",
        "explanation": "Because it is stated in the notes."
      }
    ]
    ```
    '''

    payload = app_module.extract_json_payload(raw_response)

    assert isinstance(payload, list)
    assert payload[0]['question'] == 'What is the main idea?'
    assert payload[0]['correct_answer'] == 'A'


def test_get_fallback_quiz_uses_notes_when_ai_fails():
    notes = 'Photosynthesis converts light into chemical energy in plants.'

    questions = app_module.get_fallback_quiz(notes, count=2)

    assert len(questions) == 2
    assert questions[0]['question']
    assert questions[0]['correct_answer'] in questions[0]['options']


def test_get_fallback_flashcards_uses_notes_when_ai_fails():
    notes = 'Photosynthesis converts light into chemical energy in plants.'

    flashcards = app_module.get_fallback_flashcards(notes, count=2)

    assert len(flashcards) == 2
    assert flashcards[0]['term']
    assert flashcards[0]['definition']
