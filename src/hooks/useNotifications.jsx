import React, { useState, useEffect, useRef } from 'react';
import { db, isFirebaseEnabled } from '../services/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from './../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const useNotifications = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const prevHighPriorityIds = useRef(new Set());
  const isInitialMount = useRef(true);

  // Derive unique LocalStorage key for this user's read state
  const userId = currentUser?.uid || 'guest';
  const localStorageKey = `${userId}_readAnnouncements`;

  useEffect(() => {
    // Helper to compute unread count based on active announcements and read IDs
    const computeUnread = (activeAnnouncements) => {
      let readIds = [];
      try {
        const stored = localStorage.getItem(localStorageKey);
        if (stored) {
          readIds = JSON.parse(stored);
        }
      } catch (e) {
        console.error('Failed to parse read announcements from LocalStorage', e);
      }
      
      const unreadList = activeAnnouncements.filter(a => !readIds.includes(a.id));
      setUnreadCount(unreadList.length);
    };

    // Helper to process high priority alerts for showing toaster notifications
    const processHighPriorityAlerts = (highPriorityAlerts) => {
      const currentIds = new Set(highPriorityAlerts.map(a => a.id));

      if (isInitialMount.current) {
        // Just populate the initial set on mount, don't trigger alerts for existing documents
        prevHighPriorityIds.current = currentIds;
        isInitialMount.current = false;
        return;
      }

      highPriorityAlerts.forEach(ann => {
        if (!prevHighPriorityIds.current.has(ann.id)) {
          // A brand new high priority announcement appeared!
          toast((t) => (
            <div className="flex items-center justify-between gap-4 text-left">
              <div>
                <p className="font-extrabold text-xs text-rose-500">🔴 Critical Update</p>
                <p className="text-[11px] text-slate-300 font-semibold mt-0.5">{ann.title}</p>
              </div>
              <button
                onClick={() => {
                  navigate('/alerts');
                  toast.dismiss(t.id);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition"
              >
                View
              </button>
            </div>
          ), {
            duration: 6000,
            id: ann.id, // avoid duplicate toasts for the same announcement ID
            style: {
              background: '#0f172a',
              color: '#ffffff',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '16px',
              padding: '12px 16px',
            }
          });
        }
      });

      prevHighPriorityIds.current = currentIds;
    };

    if (isFirebaseEnabled) {
      // 1. Subscribe to ALL active announcements to compute unreadCount
      const activeQuery = query(
        collection(db, 'announcements'),
        where('isActive', '==', true)
      );

      const unsubscribe = onSnapshot(activeQuery, (snapshot) => {
        const activeAnnouncements = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Compute unread count
        computeUnread(activeAnnouncements);

        // Process high priority items for notification toast
        const highPriority = activeAnnouncements.filter(a => a.priority === 'high');
        processHighPriorityAlerts(highPriority);
      }, (err) => {
        console.error('Error fetching announcements in useNotifications:', err);
      });

      return () => unsubscribe();
    } else {
      // Local Storage Mock mode fallback
      const syncNotifications = () => {
        let localAnnouncements = [];
        try {
          const stored = localStorage.getItem('citybus_mock_announcements');
          if (stored) {
            localAnnouncements = JSON.parse(stored);
          }
        } catch (e) {
          console.error(e);
        }

        const activeAnnouncements = localAnnouncements.filter(a => a.isActive);
        computeUnread(activeAnnouncements);

        const highPriority = activeAnnouncements.filter(a => a.priority === 'high');
        processHighPriorityAlerts(highPriority);
      };

      syncNotifications();
      const interval = setInterval(syncNotifications, 1000);
      return () => clearInterval(interval);
    }
  }, [userId, localStorageKey, navigate]);

  return { unreadCount };
};

export default useNotifications;
