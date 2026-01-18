"""
Hybrid factory utility that combines Factory Boy with model_bakery.
Uses Factory Boy for complex models, model_bakery as fallback/auto-update.
"""
from model_bakery import baker
from typing import Type, Optional, Any
import warnings


def make_instance(model_class: Type, factory_class: Optional[Type] = None, **kwargs):
    """
    Hybrid factory function that:
    1. Uses Factory Boy factory if provided and available
    2. Falls back to model_bakery if factory is missing fields
    3. Merges kwargs with auto-generated data
    
    Args:
        model_class: The Django model class
        factory_class: Optional Factory Boy factory class
        **kwargs: Field values to override
    
    Returns:
        Model instance created by factory or model_bakery
    
    Usage:
        # Use factory (preferred)
        from factories.core_factories import CustomUserFactory
        from core.models import CustomUser
        user = make_instance(CustomUser, CustomUserFactory)
        
        # Auto-generate with model_bakery (fallback)
        user = make_instance(CustomUser)
        
        # Override specific fields
        user = make_instance(CustomUser, CustomUserFactory, email='test@example.com')
    """
    if factory_class:
        try:
            # Try Factory Boy first
            return factory_class.create(**kwargs)
        except Exception as e:
            # If factory fails (e.g., missing field), fall back to model_bakery
            warnings.warn(
                f"Factory {factory_class.__name__} failed: {e}. "
                f"Falling back to model_bakery for {model_class.__name__}",
                UserWarning
            )
            return baker.make(model_class, **kwargs)
    else:
        # No factory provided, use model_bakery directly
        return baker.make(model_class, **kwargs)


def prepare_instance(model_class: Type, factory_class: Optional[Type] = None, **kwargs):
    """
    Similar to make_instance but uses .build() instead of .create().
    Returns an unsaved instance.
    
    Usage:
        user = prepare_instance(CustomUser, CustomUserFactory)
        # Modify user before saving
        user.save()
    """
    if factory_class:
        try:
            # Try Factory Boy first
            return factory_class.build(**kwargs)
        except Exception as e:
            # Fall back to model_bakery
            warnings.warn(
                f"Factory {factory_class.__name__} failed: {e}. "
                f"Falling back to model_bakery for {model_class.__name__}",
                UserWarning
            )
            return baker.prepare(model_class, **kwargs)
    else:
        # No factory provided, use model_bakery directly
        return baker.prepare(model_class, **kwargs)
