from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('decision', '0003_signal_structured'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='DecisionEdge',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('from_decision', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='outgoing_edges', to='decision.decision')),
                ('to_decision', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='incoming_edges', to='decision.decision')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_decision_edges', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'decision_edges',
            },
        ),
        migrations.AddConstraint(
            model_name='decisionedge',
            constraint=models.UniqueConstraint(fields=('from_decision', 'to_decision'), name='unique_decision_edge'),
        ),
        migrations.AddConstraint(
            model_name='decisionedge',
            constraint=models.CheckConstraint(check=~models.Q(('from_decision', models.F('to_decision'))), name='decision_edge_no_self_loop'),
        ),
    ]
