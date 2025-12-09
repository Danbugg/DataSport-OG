exports.config = {
    runner: 'local',
    port: 4723,
    path: '/',  // ← CAMBIADO: Appium 2.x usa '/' en lugar de '/wd/hub'
    specs: ['./test/specs/**/*.js'],
    maxInstances: 1,
    
    capabilities: [{
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:deviceName': 'Android',
        'appium:udid': 'c8603f6e',
        'appium:appPackage': 'com.datasport.cursoapp',
        'appium:appActivity': '.MainActivity',
        'appium:noReset': true,
        'appium:fullReset': false,
        'appium:dontStopAppOnReset': true,
        'appium:autoGrantPermissions': true,
        'appium:newCommandTimeout': 600,
        'appium:androidInstallTimeout': 90000,
        'appium:ignoreHiddenApiPolicyError': true,
        'appium:skipLogcatCapture': true,
        'appium:skipServerInstallation': true,  // ← AGREGADO
        'appium:skipDeviceInitialization': false,  // ← AGREGADO
        'appium:disableWindowAnimation': true,  // ← AGREGADO: acelera las pruebas
        'appium:waitForIdleTimeout': 0  // ← AGREGADO: evita esperas innecesarias
    }],
    
    logLevel: 'info',
    bail: 0,
    
    // Timeouts aumentados y optimizados
    waitforTimeout: 30000,
    connectionRetryTimeout: 180000,
    connectionRetryCount: 3,
    
    framework: 'mocha',
    reporters: ['spec'],
    
    mochaOpts: {
        ui: 'bdd',
        timeout: 120000,  // 2 minutos para cada test
        retries: 1  // ← AGREGADO: reintenta tests fallidos una vez
    },
    
    // ← AGREGADO: Hooks para mejor manejo
    before: async function() {
        // Configurar timeouts implícitos
        await browser.setTimeout({
            implicit: 15000,
            pageLoad: 30000,
            script: 30000
        });
        
        console.log('🚀 Configuración inicial completada');
    },
    
    beforeTest: async function(test) {
        console.log(`\n📝 Iniciando: ${test.title}`);
    },
    
    afterTest: async function(test, context, { error }) {
        if (error) {
            // Capturar screenshot en caso de error
            const timestamp = new Date().getTime();
            const screenshotPath = `./screenshots/error-${timestamp}.png`;
            
            try {
                await browser.saveScreenshot(screenshotPath);
                console.log(`📸 Screenshot guardado: ${screenshotPath}`);
            } catch (e) {
                console.log('⚠️ No se pudo guardar screenshot');
            }
        }
    },
    
    onComplete: function() {
        console.log('\n✅ Todas las pruebas completadas');
    }
};