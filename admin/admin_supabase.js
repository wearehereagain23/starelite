// supabase.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

const AUTH_KEY = 'Blue Block_user_session';

export const AuthService = {
    // ADD THIS FUNCTION:
    setSession(uuid) {
        localStorage.setItem(AUTH_KEY, uuid);
    },

    getSession() {
        return localStorage.getItem(AUTH_KEY);
    },

    removeSession() {
        localStorage.removeItem(AUTH_KEY);
    },

    async fetchProfile(uuid) {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('uuid', uuid)
            .single();
        if (error) throw error;
        return data;
    }
};



/**
 * Global Logout Logic
 * @param {Function} onComplete - The page-specific redirect function
 */
export const handleGlobalLogout = async (onComplete) => {
    // Show Loading Overlay
    Swal.fire({
        title: 'Processing Logout...',
        allowOutsideClick: false,
        background: '#01123c',
        color: '#fff',
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        // 1. Clear Local Auth Keys
        localStorage.clear();
        sessionStorage.clear();

        // 2. Execute only the provided callback
        onComplete();

    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Logout Error',
            text: error.message,
            background: '#01123c',
            color: '#fff'
        });
    }
};