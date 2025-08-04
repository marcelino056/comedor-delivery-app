/**
 * Módulo de Configuración
 * Gestión de configuración de empresa y RNC
 */

// Función para cargar configuración de empresa
async function cargarConfiguracionEmpresa() {
    try {
        const response = await fetch(`${window.APIModule.API_BASE}/configuracion-empresa`);
        window.StateModule.state.configuracionEmpresa = await response.json();
        console.log('Configuración de empresa cargada:', window.StateModule.state.configuracionEmpresa);
        
        // Actualizar header inmediatamente después de cargar
        actualizarHeaderEmpresa();
    } catch (error) {
        console.error('Error cargando configuración de empresa:', error);
    }
}

// Función para abrir configuración
function abrirConfiguracion() {
    window.openModal('configuracion-empresa');
}

// Función para actualizar header de empresa
function actualizarHeaderEmpresa() {
    const config = window.StateModule.state.configuracionEmpresa;
    if (!config) return;

    // Actualizar nombre
    const nombreHeader = document.getElementById('empresa-nombre-header');
    if (nombreHeader) {
        nombreHeader.textContent = config.nombre || 'Comedor & Delivery';
    }

    // Actualizar logo
    const logoHeader = document.getElementById('empresa-logo-header');
    if (logoHeader && config.logo) {
        logoHeader.src = config.logo;
        logoHeader.classList.remove('hidden');
    } else if (logoHeader) {
        logoHeader.classList.add('hidden');
    }

    // Actualizar RNC
    const rncHeader = document.getElementById('empresa-rnc-header');
    if (rncHeader && config.rnc) {
        rncHeader.textContent = config.rnc;
        rncHeader.classList.remove('hidden');
    } else if (rncHeader) {
        rncHeader.classList.add('hidden');
    }

    // Actualizar teléfono
    const telefonoHeader = document.getElementById('empresa-telefono-header');
    if (telefonoHeader && config.telefono) {
        telefonoHeader.textContent = config.telefono;
        telefonoHeader.classList.remove('hidden');
    } else if (telefonoHeader) {
        telefonoHeader.classList.add('hidden');
    }

    // Actualizar dirección
    const direccionHeader = document.getElementById('empresa-direccion-header');
    if (direccionHeader && config.direccion) {
        direccionHeader.textContent = config.direccion;
        direccionHeader.classList.remove('hidden');
    } else if (direccionHeader) {
        direccionHeader.classList.add('hidden');
    }

    // Actualizar título de la página
    document.title = config.nombre || 'Comedor & Delivery';
}

// Función para configurar modal de empresa
async function setupConfiguracionEmpresaModal() {
    try {
        // Cargar configuración actual si no está cargada
        if (!window.StateModule.state.configuracionEmpresa || !window.StateModule.state.configuracionEmpresa._id) {
            await cargarConfiguracionEmpresa();
        }

        // Llenar formulario con datos actuales
        const config = window.StateModule.state.configuracionEmpresa;
        const nombreInput = document.getElementById('empresa-nombre');
        const direccionInput = document.getElementById('empresa-direccion');
        const telefonoInput = document.getElementById('empresa-telefono');
        const rncInput = document.getElementById('empresa-rnc');
        
        if (nombreInput) nombreInput.value = config.nombre || '';
        if (direccionInput) direccionInput.value = config.direccion || '';
        if (telefonoInput) telefonoInput.value = config.telefono || '';
        if (rncInput) rncInput.value = config.rnc || '';

        // Configurar preview del logo si existe
        if (config.logo) {
            mostrarPreviewLogo(config.logo);
        }

        // Configurar event listener para el input de archivo
        const logoInput = document.getElementById('empresa-logo');
        if (logoInput) {
            logoInput.addEventListener('change', manejarCambioLogo);
        }

    } catch (error) {
        console.error('Error configurando modal de empresa:', error);
    }
}

// Función para manejar cambio de logo
function manejarCambioLogo(event) {
    const file = event.target.files[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) { // 2MB límite
            window.notify.warning('El archivo es muy grande. El tamaño máximo permitido es 2MB.');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            mostrarPreviewLogo(e.target.result);
        };
        reader.readAsDataURL(file);
    }
}

// Función para mostrar preview del logo
function mostrarPreviewLogo(logoDataUrl) {
    const preview = document.getElementById('logo-preview');
    const img = document.getElementById('logo-preview-img');
    
    if (img) img.src = logoDataUrl;
    if (preview) preview.classList.remove('hidden');
}

// Función para remover logo
function removerLogo() {
    const preview = document.getElementById('logo-preview');
    const logoInput = document.getElementById('empresa-logo');
    
    if (preview) preview.classList.add('hidden');
    if (logoInput) logoInput.value = '';
}

// Función para guardar configuración de empresa
async function guardarConfiguracionEmpresa() {
    try {
        window.APIModule.showLoading(true);

        const nombreInput = document.getElementById('empresa-nombre');
        const direccionInput = document.getElementById('empresa-direccion');
        const telefonoInput = document.getElementById('empresa-telefono');
        const rncInput = document.getElementById('empresa-rnc');
        
        const formData = {
            nombre: nombreInput?.value || '',
            direccion: direccionInput?.value || '',
            telefono: telefonoInput?.value || '',
            rnc: rncInput?.value || ''
        };

        // Manejar logo si existe
        const logoInput = document.getElementById('empresa-logo');
        if (logoInput && logoInput.files[0]) {
            // Nuevo logo seleccionado
            const file = logoInput.files[0];
            const reader = new FileReader();
            
            const logoDataUrl = await new Promise((resolve) => {
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
            
            formData.logo = logoDataUrl;
        } else if (window.StateModule.state.configuracionEmpresa && window.StateModule.state.configuracionEmpresa.logo) {
            // Mantener logo existente si no se seleccionó uno nuevo
            const preview = document.getElementById('logo-preview');
            if (preview && !preview.classList.contains('hidden')) {
                formData.logo = window.StateModule.state.configuracionEmpresa.logo;
            }
        }

        const response = await fetch(`${window.APIModule.API_BASE}/configuracion-empresa`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error || `Error ${response.status}: ${response.statusText}`;
            throw new Error(errorMessage);
        }

        const configActualizada = await response.json();
        window.StateModule.state.configuracionEmpresa = configActualizada;

        window.closeModal();
        window.notify.success('Configuración guardada exitosamente');
        
        // Actualizar el header con la nueva configuración
        actualizarHeaderEmpresa();

    } catch (error) {
        console.error('Error guardando configuración de empresa:', error);
        console.error('Detalles del error:', {
            message: error.message,
            stack: error.stack
        });
        window.notify.error(`Error al guardar: ${error.message}`);
    } finally {
        window.APIModule.showLoading(false);
    }
}

// ============= SISTEMA DE CONFIGURACIÓN RNC =============

// Función para cargar configuraciones RNC
async function cargarConfiguracionesRNC() {
    try {
        const response = await fetch(`${window.APIModule.API_BASE}/configuracion-rnc`);
        window.StateModule.state.configuracionesRNC = await response.json();
        updateConfiguracionesRNCView();
    } catch (error) {
        console.error('Error cargando configuraciones RNC:', error);
        window.notify.error('Error cargando configuraciones RNC');
    }
}

// Función para actualizar vista de configuraciones RNC
function updateConfiguracionesRNCView() {
    const container = document.getElementById('configuraciones-rnc-list');
    if (!container) return;

    const configuraciones = window.StateModule.state.configuracionesRNC || [];
    
    if (configuraciones.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚙️</div>
                <h3>No hay configuraciones RNC</h3>
                <p>Agregue configuraciones para generar facturas fiscales.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = configuraciones.map(config => createConfiguracionRNCCard(config)).join('');
}

// Función para crear tarjeta de configuración RNC
function createConfiguracionRNCCard(config) {
    return `
        <div class="configuracion-rnc-card">
            <div class="configuracion-header">
                <h4>${config.nombre}</h4>
                <span class="configuracion-estado ${config.activa ? 'activa' : 'inactiva'}">
                    ${config.activa ? 'Activa' : 'Inactiva'}
                </span>
            </div>
            <div class="configuracion-info">
                <div><strong>RNC:</strong> ${config.rnc}</div>
                <div><strong>Secuencia:</strong> ${config.secuenciaActual}</div>
                <div><strong>Tipo:</strong> ${config.tipoComprobante}</div>
            </div>
            <div class="configuracion-actions">
                <button class="btn-action" onclick="editarConfiguracionRNC('${config._id}')" title="Editar">
                    ✏️ Editar
                </button>
                <button class="btn-action ${config.activa ? 'danger' : 'success'}" 
                        onclick="toggleConfiguracionRNC('${config._id}')" 
                        title="${config.activa ? 'Desactivar' : 'Activar'}">
                    ${config.activa ? '❌ Desactivar' : '✅ Activar'}
                </button>
            </div>
        </div>
    `;
}

// Función para guardar configuración RNC
async function guardarConfiguracionRNC() {
    try {
        const formData = {
            nombre: document.getElementById('rnc-nombre')?.value || '',
            rnc: document.getElementById('rnc-numero')?.value || '',
            tipoComprobante: document.getElementById('rnc-tipo')?.value || '',
            secuenciaInicial: parseInt(document.getElementById('rnc-secuencia')?.value) || 1,
            activa: document.getElementById('rnc-activa')?.checked || false
        };

        if (!formData.nombre || !formData.rnc || !formData.tipoComprobante) {
            window.notify.warning('Complete todos los campos requeridos');
            return;
        }

        window.APIModule.showLoading(true);

        const response = await fetch(`${window.APIModule.API_BASE}/configuracion-rnc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
        }

        const configuracion = await response.json();
        
        if (!window.StateModule.state.configuracionesRNC) {
            window.StateModule.state.configuracionesRNC = [];
        }
        window.StateModule.state.configuracionesRNC.push(configuracion);

        window.closeModal();
        window.notify.success('Configuración RNC guardada exitosamente');
        updateConfiguracionesRNCView();

    } catch (error) {
        console.error('Error guardando configuración RNC:', error);
        window.notify.error(`Error al guardar: ${error.message}`);
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Función para editar configuración RNC
function editarConfiguracionRNC(configId) {
    const config = window.StateModule.state.configuracionesRNC?.find(c => c._id === configId);
    if (!config) {
        window.notify.error('Configuración no encontrada');
        return;
    }

    // Abrir modal con datos precargados
    window.openModal('configuracion-rnc');
    
    setTimeout(() => {
        const nombreInput = document.getElementById('rnc-nombre');
        const rncInput = document.getElementById('rnc-numero');
        const tipoInput = document.getElementById('rnc-tipo');
        const secuenciaInput = document.getElementById('rnc-secuencia');
        const activaInput = document.getElementById('rnc-activa');
        
        if (nombreInput) nombreInput.value = config.nombre;
        if (rncInput) rncInput.value = config.rnc;
        if (tipoInput) tipoInput.value = config.tipoComprobante;
        if (secuenciaInput) secuenciaInput.value = config.secuenciaActual;
        if (activaInput) activaInput.checked = config.activa;
        
        // Cambiar función del formulario para actualizar en lugar de crear
        const form = document.querySelector('#modal form');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                actualizarConfiguracionRNC(configId);
            };
        }
    }, 100);
}

// Función para actualizar configuración RNC
async function actualizarConfiguracionRNC(configId) {
    try {
        const formData = {
            nombre: document.getElementById('rnc-nombre')?.value || '',
            rnc: document.getElementById('rnc-numero')?.value || '',
            tipoComprobante: document.getElementById('rnc-tipo')?.value || '',
            secuenciaActual: parseInt(document.getElementById('rnc-secuencia')?.value) || 1,
            activa: document.getElementById('rnc-activa')?.checked || false
        };

        if (!formData.nombre || !formData.rnc || !formData.tipoComprobante) {
            window.notify.warning('Complete todos los campos requeridos');
            return;
        }

        window.APIModule.showLoading(true);

        const response = await fetch(`${window.APIModule.API_BASE}/configuracion-rnc/${configId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
        }

        const configuracionActualizada = await response.json();
        
        // Actualizar en el estado
        const index = window.StateModule.state.configuracionesRNC.findIndex(c => c._id === configId);
        if (index !== -1) {
            window.StateModule.state.configuracionesRNC[index] = configuracionActualizada;
        }

        window.closeModal();
        window.notify.success('Configuración RNC actualizada exitosamente');
        updateConfiguracionesRNCView();

    } catch (error) {
        console.error('Error actualizando configuración RNC:', error);
        window.notify.error(`Error al actualizar: ${error.message}`);
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Función para activar/desactivar configuración RNC
async function toggleConfiguracionRNC(configId) {
    try {
        const config = window.StateModule.state.configuracionesRNC?.find(c => c._id === configId);
        if (!config) {
            window.notify.error('Configuración no encontrada');
            return;
        }

        const accion = config.activa ? 'desactivar' : 'activar';
        const confirmacion = await window.elegantConfirm(
            `¿Está seguro que desea ${accion} esta configuración?`,
            `${accion.charAt(0).toUpperCase() + accion.slice(1)} Configuración`
        );

        if (!confirmacion) return;

        window.APIModule.showLoading(true);

        const response = await fetch(`${window.APIModule.API_BASE}/configuracion-rnc/${configId}/toggle`, {
            method: 'PUT'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
        }

        const configuracionActualizada = await response.json();
        
        // Actualizar en el estado
        const index = window.StateModule.state.configuracionesRNC.findIndex(c => c._id === configId);
        if (index !== -1) {
            window.StateModule.state.configuracionesRNC[index] = configuracionActualizada;
        }

        window.notify.success(`Configuración ${accion}da exitosamente`);
        updateConfiguracionesRNCView();

    } catch (error) {
        console.error('Error actualizando estado de configuración RNC:', error);
        window.notify.error(`Error al ${accion === 'activar' ? 'activar' : 'desactivar'}: ${error.message}`);
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Función para generar reporte RNC
async function generarReporteRNC() {
    try {
        const fechaInicio = document.getElementById('reporte-fecha-inicio')?.value;
        const fechaFin = document.getElementById('reporte-fecha-fin')?.value;
        const configuracionId = document.getElementById('reporte-configuracion')?.value;

        if (!fechaInicio || !fechaFin) {
            window.notify.warning('Seleccione las fechas del reporte');
            return;
        }

        window.APIModule.showLoading(true);

        const params = new URLSearchParams({
            fechaInicio,
            fechaFin
        });

        if (configuracionId) {
            params.set('configuracion', configuracionId);
        }

        const response = await fetch(`${window.APIModule.API_BASE}/reportes/rnc?${params.toString()}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Crear link de descarga
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-rnc-${fechaInicio}-${fechaFin}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);

        window.closeModal();
        window.notify.success('Reporte RNC generado exitosamente');

    } catch (error) {
        console.error('Error generando reporte RNC:', error);
        window.notify.error(`Error al generar reporte: ${error.message}`);
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Exportar funciones del módulo
window.ConfiguracionModule = {
    cargarConfiguracionEmpresa,
    abrirConfiguracion,
    actualizarHeaderEmpresa,
    setupConfiguracionEmpresaModal,
    manejarCambioLogo,
    mostrarPreviewLogo,
    removerLogo,
    guardarConfiguracionEmpresa,
    cargarConfiguracionesRNC,
    updateConfiguracionesRNCView,
    guardarConfiguracionRNC,
    editarConfiguracionRNC,
    actualizarConfiguracionRNC,
    toggleConfiguracionRNC,
    generarReporteRNC
};

// Exponer funciones globalmente para compatibilidad
window.cargarConfiguracionEmpresa = cargarConfiguracionEmpresa;
window.abrirConfiguracion = abrirConfiguracion;
window.actualizarHeaderEmpresa = actualizarHeaderEmpresa;
window.setupConfiguracionEmpresaModal = setupConfiguracionEmpresaModal;
window.manejarCambioLogo = manejarCambioLogo;
window.mostrarPreviewLogo = mostrarPreviewLogo;
window.removerLogo = removerLogo;
window.guardarConfiguracionEmpresa = guardarConfiguracionEmpresa;
window.cargarConfiguracionesRNC = cargarConfiguracionesRNC;
window.updateConfiguracionesRNCView = updateConfiguracionesRNCView;
window.guardarConfiguracionRNC = guardarConfiguracionRNC;
window.editarConfiguracionRNC = editarConfiguracionRNC;
window.toggleConfiguracionRNC = toggleConfiguracionRNC;
window.generarReporteRNC = generarReporteRNC;
