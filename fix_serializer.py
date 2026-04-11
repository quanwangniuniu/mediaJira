content = open('backend/meetings/serializers.py', encoding='utf-8').read()
old = '"related_decisions",\n            "related_tasks",\n        ]'
new = '"related_decisions",\n            "related_tasks",\n            "status",\n        ]'
content = content.replace(old, new)
open('backend/meetings/serializers.py', 'w', encoding='utf-8').write(content)
print('Done')
