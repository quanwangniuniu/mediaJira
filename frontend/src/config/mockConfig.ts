/**
 * 🎯 Mock Data Configuration
 * 
 * Toggle these flags to switch between mock and real backend
 * 
 * USE_MOCK_MODE:
 *   - true  = Use mock data for demo purposes (no backend required)
 *   - false = Use real backend API (current setting for testing)
 * 
 * USE_MOCK_FALLBACK:
 *   - true  = Fall back to mock data when backend fails
 *   - false = Show errors when backend fails (better for debugging)
 */

export const MOCK_CONFIG = {
  // 🔴 CURRENT MODE: Real Backend (for testing export functionality)
  USE_MOCK_MODE: false,
  
  // 🔴 FALLBACK: Disabled (no mock fallback on errors)
  USE_MOCK_FALLBACK: false,
};

/**
 * Quick Toggle Instructions:
 * 
 * For Demo Mode (no backend):
 *   USE_MOCK_MODE: true
 *   USE_MOCK_FALLBACK: true
 * 
 * For Backend Testing (current):
 *   USE_MOCK_MODE: false
 *   USE_MOCK_FALLBACK: false
 * 
 * For Backend with Fallback:
 *   USE_MOCK_MODE: false
 *   USE_MOCK_FALLBACK: true
 */

