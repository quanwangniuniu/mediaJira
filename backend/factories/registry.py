"""
Factory registry that maps models to factories.
Helps with auto-discovery and validation.
"""
from typing import Dict, Type, Optional
from django.db import models
from factory import Factory

# Registry mapping models to factories
FACTORY_REGISTRY: Dict[Type[models.Model], Type[Factory]] = {}


def register_factory(model_class: Type[models.Model], factory_class: Type[Factory]):
    """
    Register a factory for a model.
    
    Args:
        model_class: Django model class
        factory_class: Factory Boy factory class
    """
    FACTORY_REGISTRY[model_class] = factory_class


def get_factory(model_class: Type[models.Model]) -> Optional[Type[Factory]]:
    """
    Get factory for a model, or None if not registered.
    
    Args:
        model_class: Django model class
    
    Returns:
        Factory class or None
    """
    return FACTORY_REGISTRY.get(model_class)


def get_all_registered_models() -> list:
    """Get list of all models that have registered factories."""
    return list(FACTORY_REGISTRY.keys())


def get_all_registered_factories() -> list:
    """Get list of all registered factory classes."""
    return list(FACTORY_REGISTRY.values())


# Auto-register all factories
def auto_register():
    """
    Auto-register all factories from the factories package.
    This should be called after all factory imports.
    """
    try:
        from factories import __all__ as factory_names
        import factories
        
        registered_count = 0
        for factory_name in factory_names:
            try:
                factory_class = getattr(factories, factory_name)
                if hasattr(factory_class, '_meta') and hasattr(factory_class._meta, 'model'):
                    model_class = factory_class._meta.model
                    register_factory(model_class, factory_class)
                    registered_count += 1
            except Exception as e:
                # Skip factories that can't be registered
                pass
        
        return registered_count
    except ImportError:
        return 0
