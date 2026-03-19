import { getFirstUser, getUserById, upsertUserProfile, toUser, ensureUserRowExists } from '../db/supabase.js';
export async function getDemoUser(_req, res) {
    try {
        const { data: user, error } = await getFirstUser();
        if (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch user' });
            return;
        }
        if (!user) {
            res.status(404).json({ error: 'No user found. Run db:seed first.' });
            return;
        }
        res.json(toUser(user));
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
}
export async function getMe(req, res) {
    try {
        const userId = req.userId;
        // Ensure a placeholder row exists so newly-signed-in users don't fall back to demo mode.
        await ensureUserRowExists(userId, req.authUser?.email ?? null);
        const { data: user, error } = await getUserById(userId);
        if (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch profile' });
            return;
        }
        if (!user) {
            res.status(404).json({ error: 'Profile not found. Complete sign-up with POST /api/user/profile.' });
            return;
        }
        res.json(toUser(user));
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
}
export async function updateProfile(req, res) {
    try {
        const userId = req.userId;
        const { name, age, condition } = req.body;
        if (!name || typeof age !== 'number' || !condition) {
            res.status(400).json({ error: 'Missing or invalid: name, age, condition' });
            return;
        }
        const email = req.authUser?.email ?? null;
        const { data, error } = await upsertUserProfile(userId, { name, age, condition, email });
        if (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to save profile' });
            return;
        }
        res.json(data ? toUser(data) : {});
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to save profile' });
    }
}
