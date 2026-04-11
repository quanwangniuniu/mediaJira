content = open('backend/meetings/tests/test_meeting_lifecycle.py', encoding='utf-8').read()
old = 'defaults = dict(title="Test Meeting", meeting_type="planning", objective="Some objective")'
new = '''from meetings.services import ensure_meeting_type_definition
    type_def = ensure_meeting_type_definition(project, "planning")
    defaults = dict(title="Test Meeting", type_definition=type_def, objective="Some objective")'''
content = content.replace(old, new)
open('backend/meetings/tests/test_meeting_lifecycle.py', 'w', encoding='utf-8').write(content)
print('Done')
