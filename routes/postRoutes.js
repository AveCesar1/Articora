const router = require('express').Router();


router.post('/login',(req,res) =>{
   const { email, password } = req.body;

    // Falta la lógica para buscar en la bd
    //si la validación es correcta: 
    const userFound = { id: 1, name: 'Cesar' }; 

    req.session.user_id = userFound.id;
    req.session.user_name = userFound.name;

    res.redirect('/perfil'); // Ahora el middleware lo dejará pasar
});


module.exports = router;
module.exports = function (app) {
    // Ejemplo de placeholder (no modificar datos por defecto aquí)
    // app.post('/api/example', (req, res) => {
    //     const defaultData = { /* ...datos por defecto... */ };
    //     res.json({ success: true, data: defaultData });
    // });
};