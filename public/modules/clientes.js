/**
 * Módulo de Clientes
 * Manejo de clientes y sus datos
 */

// Función para cargar clientes
async function cargarClientes() {
    try {
        console.log('Cargando clientes desde API...');
        const response = await fetch(`${window.APIModule.API_BASE}/clientes`);
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const clientes = await response.json();
        console.log('Clientes recibidos del servidor:', clientes.length);
        
        window.StateModule.state.clientes = clientes;
        updateClientesView();
        
        // Log de clientes con crédito para debug
        const clientesConCredito = clientes.filter(c => c.creditoHabilitado);
        console.log('Clientes con crédito habilitado:', clientesConCredito.length, clientesConCredito.map(c => c.nombre));
        
    } catch (error) {
        console.error('Error cargando clientes:', error);
        window.notify.error('Error al cargar clientes: ' + error.message);
        // Asegurar que state.clientes es un array vacío en caso de error
        window.StateModule.state.clientes = [];
    }
}

// Función para actualizar la vista de clientes
function updateClientesView() {
    const list = document.getElementById('clientes-list');
    if (!list) return;

    if (window.StateModule.state.clientes.length === 0) {
        list.innerHTML = '<p class="no-data">No hay clientes registrados</p>';
        return;
    }

    list.innerHTML = window.StateModule.state.clientes.map(cliente => `
        <div class="cliente-card">
            <div class="cliente-header">
                <div class="cliente-info">
                    <h4>${cliente.nombre}</h4>
                    <div class="cliente-telefono">
                        📞 ${cliente.telefono}
                    </div>
                    ${cliente.rnc ? `<span class="cliente-rnc">RNC: ${cliente.rnc}</span>` : ''}
                    ${cliente.creditoHabilitado ? `
                        <div class="cliente-credito">
                            💳 Crédito: $${cliente.limiteCredito?.toFixed(2) || 0} 
                            (Pendiente: $${cliente.saldoPendiente?.toFixed(2) || 0})
                        </div>
                    ` : ''}
                </div>
            </div>
            ${cliente.direccion ? `<div class="cliente-direccion">📍 ${cliente.direccion}</div>` : ''}
            ${cliente.email ? `<div class="cliente-email">✉️ ${cliente.email}</div>` : ''}
            <div class="cliente-actions">
                <button class="btn-secondary btn-sm" onclick="editarCliente('${cliente._id}')">
                    ✏️ Editar
                </button>
                <button class="btn-primary btn-sm" onclick="crearFacturaParaCliente('${cliente._id}')">
                    📄 Facturar
                </button>
                ${cliente.creditoHabilitado ? `
                    <button class="btn-info btn-sm" onclick="abrirConduce('${cliente._id}')">
                        📋 Conduce
                    </button>
                ` : ''}
                <button class="btn-danger btn-sm" onclick="desactivarCliente('${cliente._id}')">
                    🗑️ Desactivar
                </button>
            </div>
        </div>
    `).join('');
}

// Función para filtrar clientes
function filtrarClientes() {
    const busqueda = document.getElementById('buscar-cliente').value.toLowerCase();
    const clientesFiltrados = window.StateModule.state.clientes.filter(cliente => 
        cliente.nombre.toLowerCase().includes(busqueda) ||
        cliente.telefono.includes(busqueda) ||
        (cliente.rnc && cliente.rnc.includes(busqueda))
    );

    const list = document.getElementById('clientes-list');
    if (clientesFiltrados.length === 0) {
        list.innerHTML = '<p class="no-data">No se encontraron clientes</p>';
        return;
    }

    list.innerHTML = clientesFiltrados.map(cliente => `
        <div class="cliente-card">
            <div class="cliente-header">
                <div class="cliente-info">
                    <h4>${cliente.nombre}</h4>
                    <div class="cliente-telefono">
                        📞 ${cliente.telefono}
                    </div>
                    ${cliente.rnc ? `<span class="cliente-rnc">RNC: ${cliente.rnc}</span>` : ''}
                    ${cliente.creditoHabilitado ? `
                        <div class="cliente-credito">
                            💳 Crédito: $${cliente.limiteCredito?.toFixed(2) || 0} 
                            (Pendiente: $${cliente.saldoPendiente?.toFixed(2) || 0})
                        </div>
                    ` : ''}
                </div>
            </div>
            ${cliente.direccion ? `<div class="cliente-direccion">📍 ${cliente.direccion}</div>` : ''}
            ${cliente.email ? `<div class="cliente-email">✉️ ${cliente.email}</div>` : ''}
            <div class="cliente-actions">
                <button class="btn-secondary btn-sm" onclick="editarCliente('${cliente._id}')">
                    ✏️ Editar
                </button>
                <button class="btn-primary btn-sm" onclick="crearFacturaParaCliente('${cliente._id}')">
                    📄 Facturar
                </button>
                ${cliente.creditoHabilitado ? `
                    <button class="btn-info btn-sm" onclick="abrirConduce('${cliente._id}')">
                        📋 Conduce
                    </button>
                ` : ''}
                <button class="btn-danger btn-sm" onclick="desactivarCliente('${cliente._id}')">
                    🗑️ Desactivar
                </button>
            </div>
        </div>
    `).join('');
}

// Función para guardar cliente
async function guardarCliente(event) {
    event.preventDefault();
    
    try {
        window.APIModule.showLoading(true);
        
        const creditoHabilitado = document.getElementById('cliente-credito-habilitado').checked;
        
        const formData = {
            nombre: document.getElementById('cliente-nombre').value,
            telefono: document.getElementById('cliente-telefono').value,
            rnc: document.getElementById('cliente-rnc').value,
            direccion: document.getElementById('cliente-direccion').value,
            email: document.getElementById('cliente-email').value,
            creditoHabilitado: creditoHabilitado,
            limiteCredito: creditoHabilitado ? parseFloat(document.getElementById('cliente-limite-credito').value) || 0 : 0,
            diasCredito: creditoHabilitado ? parseInt(document.getElementById('cliente-dias-credito').value) || 30 : 0
        };

        const clienteId = document.getElementById('form-cliente').dataset.clienteId;
        const method = clienteId ? 'PUT' : 'POST';
        const url = clienteId ? `${window.APIModule.API_BASE}/clientes/${clienteId}` : `${window.APIModule.API_BASE}/clientes`;

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Error al guardar cliente');

        const cliente = await response.json();
        
        if (clienteId) {
            // Actualizar cliente existente
            const index = window.StateModule.state.clientes.findIndex(c => c._id === clienteId);
            if (index !== -1) {
                window.StateModule.state.clientes[index] = cliente;
            }
        } else {
            // Agregar nuevo cliente
            window.StateModule.state.clientes.unshift(cliente);
        }

        updateClientesView();
        closeModal();
        window.notify.success(clienteId ? 'Cliente actualizado exitosamente' : 'Cliente creado exitosamente');
        
    } catch (error) {
        console.error('Error guardando cliente:', error);
        window.notify.error('No se pudo guardar el cliente. Verifica los datos e inténtalo nuevamente.');
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Función para editar cliente
async function editarCliente(id) {
    const cliente = window.StateModule.state.clientes.find(c => c._id === id);
    if (!cliente) return;

    openModal('cliente');
    
    // Llenar formulario
    document.getElementById('cliente-nombre').value = cliente.nombre;
    document.getElementById('cliente-telefono').value = cliente.telefono;
    document.getElementById('cliente-rnc').value = cliente.rnc || '';
    document.getElementById('cliente-direccion').value = cliente.direccion || '';
    document.getElementById('cliente-email').value = cliente.email || '';
    
    // Configurar campos de crédito
    const creditoHabilitado = document.getElementById('cliente-credito-habilitado');
    creditoHabilitado.checked = cliente.creditoHabilitado || false;
    
    if (cliente.creditoHabilitado) {
        document.getElementById('cliente-limite-credito').value = cliente.limiteCredito || 0;
        document.getElementById('cliente-dias-credito').value = cliente.diasCredito || 30;
    }
    
    // Mostrar/ocultar campos de crédito según el estado
    toggleCreditoFields();
    
    // Marcar como edición
    document.getElementById('form-cliente').dataset.clienteId = id;
    document.getElementById('modal-title').textContent = 'Editar Cliente';
}

// Función para desactivar cliente
async function desactivarCliente(id) {
    const confirmed = await window.elegantConfirm(
        '¿Estás seguro de desactivar este cliente?',
        'Desactivar Cliente'
    );
    if (!confirmed) return;

    try {
        window.APIModule.showLoading(true);
        
        const response = await fetch(`${window.APIModule.API_BASE}/clientes/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Error al desactivar cliente');

        // Remover de la lista
        window.StateModule.state.clientes = window.StateModule.state.clientes.filter(c => c._id !== id);
        updateClientesView();
        window.notify.success('Cliente desactivado exitosamente');
        
    } catch (error) {
        console.error('Error desactivando cliente:', error);
        window.notify.error('No se pudo desactivar el cliente. Inténtalo nuevamente.');
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Función para crear factura para cliente específico
function crearFacturaParaCliente(clienteId) {
    openModal('factura');
    
    // Preseleccionar cliente
    setTimeout(() => {
        const selectCliente = document.getElementById('factura-cliente');
        if (selectCliente) {
            selectCliente.value = clienteId;
            actualizarDatosCliente();
        }
    }, 100);
}

// Función para abrir conduce para cliente específico
function abrirConduce(clienteId) {
    openModal('conduce');
    
    // Preseleccionar cliente
    setTimeout(() => {
        const selectCliente = document.getElementById('conduce-cliente');
        if (selectCliente) {
            selectCliente.value = clienteId;
            if (window.CreditosModule && window.CreditosModule.verificarCreditoCliente) {
                window.CreditosModule.verificarCreditoCliente();
            }
        }
    }, 100);
}

// Función para actualizar datos del cliente en factura
function actualizarDatosCliente() {
    const clienteId = document.getElementById('factura-cliente').value;
    const cliente = window.StateModule.state.clientes.find(c => c._id === clienteId);
    
    if (cliente && cliente.rnc) {
        document.getElementById('factura-tipo').value = 'FACTURA';
        if (window.FacturasModule && window.FacturasModule.toggleRNCOptions) {
            window.FacturasModule.toggleRNCOptions();
        }
    }
}

// Función para toggle de campos de crédito
function toggleCreditoFields() {
    const creditoHabilitado = document.getElementById('cliente-credito-habilitado').checked;
    const creditoFields = document.getElementById('credito-fields');
    
    if (creditoHabilitado) {
        creditoFields.classList.remove('hidden');
    } else {
        creditoFields.classList.add('hidden');
    }
}

// Buscar o crear cliente (usado por conduces automáticos)
async function buscarOCrearCliente(nombre, telefono, direccion) {
    try {
        console.log('👤 CLIENTE: Buscando cliente por teléfono:', telefono);
        
        // Buscar cliente existente por teléfono
        const response = await fetch(`${window.APIModule.API_BASE}/clientes`);
        if (!response.ok) {
            throw new Error('Error al obtener clientes');
        }
        
        const clientes = await response.json();
        let cliente = clientes.find(c => c.telefono === telefono);
        
        if (cliente) {
            console.log('👤 CLIENTE: Cliente encontrado:', cliente);
            return cliente;
        }
        
        // Si no existe, crear nuevo cliente
        console.log('👤 CLIENTE: Creando nuevo cliente...');
        const nuevoCliente = {
            nombre: nombre,
            telefono: telefono,
            direccion: direccion || '',
            rnc: '',
            creditoHabilitado: true,
            limiteCredito: 50000,
            diasCredito: 30,
            saldoPendiente: 0
        };
        
        const createResponse = await fetch(`${window.APIModule.API_BASE}/clientes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoCliente)
        });
        
        if (!createResponse.ok) {
            const errorData = await createResponse.json().catch(() => ({}));
            throw new Error(errorData.error || 'Error al crear cliente');
        }
        
        cliente = await createResponse.json();
        console.log('👤 CLIENTE: Cliente creado exitosamente:', cliente);
        window.notify.success(`Cliente "${nombre}" creado automáticamente para crédito`);
        
        return cliente;
        
    } catch (error) {
        console.error('👤 CLIENTE ERROR:', error);
        throw error;
    }
}

// Exportar funciones del módulo
window.ClientesModule = {
    cargarClientes,
    updateClientesView,
    filtrarClientes,
    guardarCliente,
    editarCliente,
    desactivarCliente,
    crearFacturaParaCliente,
    abrirConduce,
    actualizarDatosCliente,
    toggleCreditoFields,
    buscarOCrearCliente
};

// Exponer funciones globalmente para compatibilidad
window.cargarClientes = cargarClientes;
window.filtrarClientes = filtrarClientes;
window.guardarCliente = guardarCliente;
window.editarCliente = editarCliente;
window.desactivarCliente = desactivarCliente;
window.crearFacturaParaCliente = crearFacturaParaCliente;
window.actualizarDatosCliente = actualizarDatosCliente;
window.toggleCreditoFields = toggleCreditoFields;
