import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

os.environ.setdefault('GEMINI_API_KEY', 'test-gemini-key')
os.environ.setdefault('YOUTUBE_API_KEY', 'test-youtube-key')

from app import build_study_plan


def test_build_study_plan_splits_time_into_study_and_break_segments():
    plan = build_study_plan('Biology', 60, 25, 5)

    assert plan[0]['type'] == 'study'
    assert plan[0]['minutes'] == 25
    assert plan[1]['type'] == 'break'
    assert plan[1]['minutes'] == 5
    assert plan[2]['type'] == 'study'
    assert plan[2]['minutes'] == 25
    assert plan[3]['type'] == 'break'
    assert plan[3]['minutes'] == 5
    assert sum(item['minutes'] for item in plan) == 60
