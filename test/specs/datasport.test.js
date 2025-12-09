describe('DataSport - Pruebas Automatizadas', () => {
    
    it('CP01: Debe iniciar la aplicación correctamente', async () => {
        console.log('🧪 CP01: Verificando inicio de aplicación');
        
        await browser.pause(5000);
        
        const activity = await browser.getCurrentActivity();
        console.log(`📱 Actividad actual: ${activity}`);
        
        expect(activity).toBe('.MainActivity');
    });

    it('CP02: Debe mostrar la pantalla de login', async () => {
        console.log('🧪 CP02: Verificando elementos de login');
        
        await browser.pause(2000);
        
        const emailInput = await $('~email-input');
        const passwordInput = await $('~password-input');
        const loginButton = await $('~login-button');
        
        const emailExists = await emailInput.isDisplayed();
        const passwordExists = await passwordInput.isDisplayed();
        const buttonExists = await loginButton.isDisplayed();
        
        console.log(`✅ Campo Email visible: ${emailExists}`);
        console.log(`✅ Campo Password visible: ${passwordExists}`);
        console.log(`✅ Botón Login visible: ${buttonExists}`);
        
        expect(emailExists).toBe(true);
        expect(passwordExists).toBe(true);
        expect(buttonExists).toBe(true);
    });

    it('CP03: Debe mostrar error con credenciales vacías', async () => {
        console.log('🧪 CP03: Validando campos vacíos');
        
        const loginButton = await $('~login-button');
        await loginButton.click();
        console.log('✅ Click en botón login sin datos');
        
        await browser.pause(2000);
        
        const errorText = await $('android=new UiSelector().textContains("correo")');
        const errorExists = await errorText.isExisting();
        
        console.log(`📋 Mensaje de error mostrado: ${errorExists}`);
        expect(errorExists).toBe(true);
    });

    it('CP04: Debe permitir ingresar email', async () => {
        console.log('🧪 CP04: Ingresando email');
        
        const emailInput = await $('~email-input');
        await emailInput.click();
        await browser.pause(500);
        
        await emailInput.setValue('test@datasport.com');
        console.log('✅ Email ingresado');
        
        const emailValue = await emailInput.getText();
        console.log(`📝 Valor ingresado: ${emailValue}`);
        
        expect(emailValue).toContain('test@datasport.com');
    });

    it('CP05: Debe permitir ingresar contraseña', async () => {
        console.log('🧪 CP05: Ingresando contraseña');
        
        const passwordInput = await $('~password-input');
        await passwordInput.click();
        await browser.pause(500);
        
        await passwordInput.setValue('Test123!@#');
        console.log('✅ Contraseña ingresada');
        
        const passwordValue = await passwordInput.getText();
        console.log(`📝 Campo contraseña tiene valor: ${passwordValue.length > 0}`);
        
        expect(passwordValue.length).toBeGreaterThan(0);
    });

    it('CP06: Debe intentar login con credenciales incorrectas', async () => {
        console.log('🧪 CP06: Login con credenciales incorrectas');
        
        const emailInput = await $('~email-input');
        const passwordInput = await $('~password-input');
        
        await emailInput.clearValue();
        await passwordInput.clearValue();
        
        await browser.pause(1000);
        
        await emailInput.setValue('usuario@falso.com');
        await passwordInput.setValue('PasswordIncorrecta123!');
        
        console.log('✅ Credenciales incorrectas ingresadas');
        
        try {
            await browser.hideKeyboard();
        } catch {}
        
        await browser.pause(500);
        
        const loginButton = await $('~login-button');
        await loginButton.click();
        
        console.log('✅ Intentando login...');
        await browser.pause(5000);
        
        const errorModal = await $('android=new UiSelector().textContains("Error")');
        const errorExists = await errorModal.isExisting();
        
        console.log(`📋 Modal de error mostrado: ${errorExists}`);
        expect(errorExists).toBe(true);
    });

    it('CP07: Debe navegar a pantalla de registro', async () => {
        console.log('🧪 CP07: Navegando a registro');
        
        const registerLink = await $('~register-link');
        const linkExists = await registerLink.isDisplayed();
        
        console.log(`✅ Link de registro visible: ${linkExists}`);
        
        if (linkExists) {
            await registerLink.click();
            console.log('✅ Click en registrarse');
            
            await browser.pause(3000);
            
            const registerText = await $('android=new UiSelector().textContains("Nueva cuenta")');
            const onRegisterScreen = await registerText.isExisting();
            
            console.log(`📱 En pantalla de registro: ${onRegisterScreen}`);
            expect(onRegisterScreen).toBe(true);
            
            await browser.back();
            await browser.pause(2000);
        }
        
        expect(linkExists).toBe(true);
    });

    it('CP08: Debe navegar a recuperar contraseña', async () => {
        console.log('🧪 CP08: Navegando a recuperar contraseña');
        
        const forgotPasswordButton = await $('~forgot-password-button');
        const buttonExists = await forgotPasswordButton.isDisplayed();
        
        console.log(`✅ Botón olvidar contraseña visible: ${buttonExists}`);
        
        if (buttonExists) {
            await forgotPasswordButton.click();
            console.log('✅ Click en olvidar contraseña');
            
            await browser.pause(3000);
            
            const activity = await browser.getCurrentActivity();
            console.log(`📱 Actividad actual: ${activity}`);
            
            await browser.back();
            await browser.pause(2000);
        }
        
        expect(buttonExists).toBe(true);
    });

    it('CP09: Debe realizar login exitoso con credenciales válidas', async () => {
        console.log('🧪 CP09: Iniciando prueba de login con credenciales válidas');

        const VALID_EMAIL = 'valentinabenavides1803@gmail.com';
        const VALID_PASSWORD = 'Danna123%';

        console.log('🔍 Buscando campos del formulario...');

        const emailInput = await $('~email-input');
        const passwordInput = await $('~password-input');
        const loginButton = await $('~login-button');

        console.log('📌 email-input encontrado:', await emailInput.isDisplayed());
        console.log('📌 password-input encontrado:', await passwordInput.isDisplayed());
        console.log('📌 login-button encontrado:', await loginButton.isDisplayed());

        console.log('🧹 Limpiando campos...');
        await emailInput.clearValue();
        await passwordInput.clearValue();

        await browser.pause(1200);

        console.log(`✏️ Intentando escribir email: ${VALID_EMAIL}`);
        await emailInput.setValue(VALID_EMAIL);

        const emailRead = await emailInput.getText();
        console.log(`📨 Email escrito realmente en el input: "${emailRead}"`);

        console.log(`🔑 Intentando escribir contraseña: ${VALID_PASSWORD}`);
        await passwordInput.setValue(VALID_PASSWORD);

        const passRead = await passwordInput.getText();
        console.log(`🕶️ Contraseña detectada en el campo (oculta): longitud = ${passRead.length}`);

        console.log('📱 Ocultando teclado si está abierto...');
        try {
            await browser.hideKeyboard();
            console.log(' Teclado ocultado correctamente');
        } catch (e) {
            console.log('No se pudo ocultar el teclado (posible que no estuviera abierto)');
        }

        await browser.pause(800);

        console.log('👉 Haciendo click en el botón de login...');
        await loginButton.click();

        console.log('⏳ Esperando respuesta del servidor...');
        await browser.pause(6000);

        console.log('🔍 Obteniendo actividad actual...');
        const activity = await browser.getCurrentActivity();
        console.log(`📱 Actividad después del login: ${activity}`);

        console.log('🔍 Buscando modal de éxito...');
        const successModal = await $('android=new UiSelector().textContains("Bienvenido")');
        const successExists = await successModal.isExisting();
        console.log(`🎉 Modal de éxito encontrado: ${successExists}`);

        const loginSuccessful = successExists || activity !== '.MainActivity';

        console.log('📊 Resultado final del login:', loginSuccessful ? 'ÉXITO' : 'FALLO');

        expect(loginSuccessful).toBe(true);
    });
});
