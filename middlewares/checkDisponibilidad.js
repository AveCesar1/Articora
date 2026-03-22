function checkDisponibilidad(req, res, next) {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid_user_id' });

    try {
        const row = req.db.prepare('SELECT id, available_for_messages FROM users WHERE id = ?').get(id);
        if (!row) return res.status(404).json({ error: 'user_not_found' });

        // Normalizamos a booleano
        req.userAvailability = !!row.available_for_messages;
        req.checkedUserId = row.id;
        return next();
    } catch (err) {
        if (debugging) console.error('checkDisponibilidad error:', err);
        return res.status(500).json({ error: 'internal_error' });
    }
}