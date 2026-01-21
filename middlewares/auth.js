function isRegistered(req, res, next){
    if(req.session && req.session.userId){
        return next();
    }
    return res.redirect('/login');
    
    ;
}

function isAdmin (req, res, next){
    if(req.session.user_role == 'admin'){
        return next();
    }
    return res.status(403).send('Acceso denegado. Solo administradores.');
}

function isVerified (req, res, next){
    if(req.session && req.session.isVerified){
        return next();
    }
    return res.status(403).send('Acceso denegado. Usuario no verificado.');
}

module.exports = isAdmin;
module.exports = isVerified;
module.exports = isRegistered;