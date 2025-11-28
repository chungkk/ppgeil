import { useState, useCallback } from 'react';

/**
 * Hook for managing points animation
 * Shows floating +1/-0.5 animations when points are awarded/deducted
 */
const usePointsAnimation = () => {
  const [pointsAnimations, setPointsAnimations] = useState([]);

  // Show points animation
  const showPointsAnimation = useCallback((points, element) => {
    if (!element) return;
    
    // Get element position (starting point)
    const rect = element.getBoundingClientRect();
    const startPosition = {
      top: rect.top + rect.height / 2 - 10,
      left: rect.left + rect.width / 2
    };
    
    // Get header points badge position (end point)
    const headerBadge = document.querySelector('[title="Your total points"]');
    let endPosition = null;

    if (headerBadge) {
      const badgeRect = headerBadge.getBoundingClientRect();
      endPosition = {
        top: badgeRect.top + badgeRect.height / 2,
        left: badgeRect.left + badgeRect.width / 2
      };
    } else {
      // Fallback: animate upwards if header badge not found
      endPosition = {
        top: startPosition.top - 100,
        left: startPosition.left
      };
    }
    
    const animationId = Date.now() + Math.random();
    setPointsAnimations(prev => [...prev, { 
      id: animationId, 
      points, 
      startPosition,
      endPosition 
    }]);
    
    // Remove animation after it completes
    setTimeout(() => {
      setPointsAnimations(prev => prev.filter(a => a.id !== animationId));
    }, 1000);
  }, []);

  // Update points on server and trigger animation
  const updatePoints = useCallback(async (user, pointsChange, reason, element = null) => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch('/api/user/points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pointsChange, reason })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Points updated: ${pointsChange > 0 ? '+' : ''}${pointsChange} (${reason})`, data);

        // Show animation
        if (element) {
          showPointsAnimation(pointsChange, element);
        }

        // Trigger points refresh in header
        if (typeof window !== 'undefined') {
          if (pointsChange > 0 && window.showPointsPlusOne) {
            window.showPointsPlusOne(pointsChange);
          }
          if (pointsChange < 0 && window.showPointsMinus) {
            window.showPointsMinus(pointsChange);
          }
          
          setTimeout(() => {
            if (window.refreshUserPoints) {
              window.refreshUserPoints();
            }
          }, 100);
          
          window.dispatchEvent(new CustomEvent('pointsUpdated', { 
            detail: { pointsChange, reason } 
          }));
        }
      } else {
        console.error('❌ Failed to update points:', response.status);
      }
    } catch (error) {
      console.error('Error updating points:', error);
    }
  }, [showPointsAnimation]);

  return {
    pointsAnimations,
    showPointsAnimation,
    updatePoints
  };
};

export default usePointsAnimation;
