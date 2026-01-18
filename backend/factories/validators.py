"""
Factory validation utilities to check if factories are in sync with models.
"""
from django.db import models
from factory import Factory
import warnings
from typing import Type, Set, List, Tuple, Dict, Any


def validate_factory(factory_class: Type[Factory], model_class: Type[models.Model]) -> Tuple[bool, List[str], Dict[str, Any]]:
    """
    Validate that a factory covers all required model fields.
    
    Args:
        factory_class: Factory Boy factory class
        model_class: Django model class
    
    Returns:
        Tuple of (is_valid, warnings_list, field_info)
        - is_valid: True if factory can create valid instances
        - warnings_list: List of warning messages
        - field_info: Dictionary with detailed field information
    """
    warnings_list = []
    
    # Get all model fields
    model_fields = {f.name: f for f in model_class._meta.get_fields()}
    
    # Get factory-declared fields
    factory_fields = set(factory_class._meta.declarations.keys())
    
    # Check for deprecated fields (in factory but not in model)
    deprecated_fields = factory_fields - model_fields.keys()
    
    # Detailed field information
    field_info = {
        'missing_required': [],
        'missing_optional': [],
        'deprecated': list(deprecated_fields)
    }
    
    # Check required fields (non-nullable, no default)
    required_fields = set()
    missing_required_fields = []
    
    for field_name, field in model_fields.items():
        if isinstance(field, models.Field):
            # Skip auto fields (id, pk) and auto-now fields
            if field.primary_key or getattr(field, 'auto_now', False) or getattr(field, 'auto_now_add', False):
                continue
            
            # Skip ManyToMany and reverse ForeignKey relations
            if isinstance(field, (models.ManyToManyField, models.ManyToOneRel, models.OneToOneRel)):
                continue
            
            # Check if field is required
            if not field.null and not field.blank and field.default == models.NOT_PROVIDED:
                # Skip if field already exists in factory
                if field.name not in factory_fields:
                    required_fields.add(field.name)
                    # Check if it's a ForeignKey
                    if isinstance(field, models.ForeignKey):
                        missing_required_fields.append({
                            'name': field.name,
                            'type': 'ForeignKey',
                            'related_model': field.related_model.__name__ if field.related_model else None,
                            'related_app': field.related_model._meta.app_label if field.related_model else None,
                            'field': field  # Keep reference to field object
                        })
                    else:
                        choices = getattr(field, 'choices', None)
                        choice_list = [choice[0] for choice in choices] if choices else None
                        missing_required_fields.append({
                            'name': field.name,
                            'type': type(field).__name__,
                            'choices': choice_list,
                            'field': field  # Keep reference to field object
                        })
    
    # Check missing required fields
    missing_required = required_fields - factory_fields
    field_info['missing_required'] = missing_required_fields
    
    if missing_required:
        warnings_list.append(
            f"Missing required fields: {missing_required}. "
            f"Factory will fail when creating instances."
        )
    
    # Check for fields that might need attention (new fields)
    new_fields = set(model_fields.keys()) - factory_fields - {'id', 'pk'}  # Exclude auto fields
    # Also exclude reverse relations
    new_fields = {f for f in new_fields if not f.endswith('_set')}
    
    missing_optional_fields = []
    for field_name in new_fields - missing_required:
        field = model_fields[field_name]
        if isinstance(field, models.Field):
            choices = getattr(field, 'choices', None)
            choice_list = [choice[0] for choice in choices] if choices else None
            missing_optional_fields.append({
                'name': field.name,
                'type': type(field).__name__,
                'null': field.null,
                'choices': choice_list,
                'field': field  # Keep reference to field object
            })
    
    field_info['missing_optional'] = missing_optional_fields
    
    if new_fields:
        warnings_list.append(
            f"New model fields not in factory: {new_fields}. "
            f"Consider adding them or they'll use model_bakery defaults."
        )
    
    # Check for deprecated fields (in factory but not in model)
    if deprecated_fields:
        warnings_list.append(
            f"Factory has fields not in model (deprecated?): {deprecated_fields}"
        )
    
    # Check choice fields for valid values
    for field in model_class._meta.get_fields():
        if isinstance(field, models.Field) and hasattr(field, 'choices') and field.choices:
            if field.name in factory_fields:
                # Factory has this field, check if it uses valid choices
                factory_declaration = factory_class._meta.declarations.get(field.name)
                if factory_declaration:
                    # This is a basic check - in practice, you'd need to evaluate the factory
                    # to see what values it generates
                    pass
    
    is_valid = len([w for w in warnings_list if 'required' in w.lower()]) == 0
    
    return is_valid, warnings_list, field_info


def validate_all_factories() -> Dict[str, Dict[str, Any]]:
    """
    Validate all factories in the factories package.
    Run this in tests or as a management command.
    
    Returns:
        Dictionary mapping factory names to validation results
    """
    # Import all factories dynamically
    try:
        from factories import __all__ as factory_names
        import factories
        
        results = {}
        for factory_name in factory_names:
            try:
                factory_class = getattr(factories, factory_name)
                if hasattr(factory_class, '_meta') and hasattr(factory_class._meta, 'model'):
                    model_class = factory_class._meta.model
                    is_valid, warnings, field_info = validate_factory(factory_class, model_class)
                    results[factory_name] = {
                        'valid': is_valid,
                        'warnings': warnings,
                        'model': model_class.__name__,
                        'model_class': model_class,
                        'factory_class': factory_class,
                        'field_info': field_info
                    }
            except Exception as e:
                results[factory_name] = {
                    'valid': False,
                    'warnings': [f"Error validating factory: {str(e)}"],
                    'model': 'Unknown',
                    'model_class': None,
                    'factory_class': None,
                    'field_info': {}
                }
        
        return results
    except ImportError as e:
        return {'error': f"Could not import factories: {str(e)}"}


def get_model_fields_summary(model_class: Type[models.Model]) -> Dict[str, Any]:
    """
    Get a summary of model fields for factory generation.
    
    Returns:
        Dictionary with field information
    """
    fields_info = {
        'required': [],
        'optional': [],
        'foreign_keys': [],
        'many_to_many': [],
        'choice_fields': [],
        'json_fields': [],
        'auto_fields': []
    }
    
    for field in model_class._meta.get_fields():
        if isinstance(field, models.Field):
            field_info = {
                'name': field.name,
                'type': type(field).__name__,
                'null': field.null,
                'blank': field.blank,
                'default': field.default
            }
            
            if field.primary_key or getattr(field, 'auto_now', False) or getattr(field, 'auto_now_add', False):
                fields_info['auto_fields'].append(field_info)
            elif isinstance(field, models.ForeignKey):
                fields_info['foreign_keys'].append(field_info)
                if not field.null and not field.blank:
                    fields_info['required'].append(field_info)
            elif isinstance(field, models.ManyToManyField):
                fields_info['many_to_many'].append(field_info)
            elif hasattr(field, 'choices') and field.choices:
                field_info['choices'] = [choice[0] for choice in field.choices]
                fields_info['choice_fields'].append(field_info)
                if not field.null and not field.blank:
                    fields_info['required'].append(field_info)
            elif isinstance(field, models.JSONField):
                fields_info['json_fields'].append(field_info)
                if not field.null and not field.blank:
                    fields_info['required'].append(field_info)
            elif not field.null and not field.blank and field.default == models.NOT_PROVIDED:
                fields_info['required'].append(field_info)
            else:
                fields_info['optional'].append(field_info)
    
    return fields_info


def get_missing_fields_from_validation(factory_class: Type[Factory], model_class: Type[models.Model]) -> Dict[str, Any]:
    """
    Get missing fields from validation result.
    Helper function to extract just the missing fields information.
    
    Args:
        factory_class: Factory Boy factory class
        model_class: Django model class
    
    Returns:
        Dictionary with missing_required and missing_optional field lists
    """
    _, _, field_info = validate_factory(factory_class, model_class)
    return field_info
