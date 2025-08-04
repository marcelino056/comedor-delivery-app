/**
 * Módulo de Créditos (Sistema de Conduces)
 * Gestión de créditos a clientes mediante conduces
 */

// Función para cargar datos de créditos
async function loadCreditos() {
    try {
        console.log('[CREDITOS] Cargando conduces y clientes...');
        const [conducesResponse, clientesResponse] = await Promise.all([
            fetch(`${window.APIModule.API_BASE}/conduces`),
            fetch(`${window.APIModule.API_BASE}/clientes`)
        ]);
        
        const conduces = await conducesResponse.json();
        const clientes = await clientesResponse.json();
        
        console.log(`[CREDITOS] Conduces cargados: ${conduces.length}, Clientes: ${clientes.length}`);
        
        // Actualizar estado global
        window.StateModule.state.conduces = conduces;
        window.StateModule.state.clientes = clientes; // Asegurar que tenemos los clientes actualizados
        
        // Actualizar resumen
        updateCreditosSummary(conduces);
        
        // Actualizar lista de conduces
        renderConducesList(conduces);
        
        // Actualizar filtros de clientes
        updateClientFilters(clientes);
        
    } catch (error) {
        console.error('Error cargando créditos:', error);
        window.notify.error('Error cargando datos de créditos');
    }
}

// Actualizar resumen de créditos
function updateCreditosSummary(conduces) {
    const pendientes = conduces.filter(c => c.estado === 'pendiente');
    const pagadosHoy = conduces.filter(c => 
        c.estado === 'pagado' && 
        new Date(c.updatedAt).toDateString() === new Date().toDateString()
    );
    
    const totalPendiente = pendientes.reduce((sum, c) => sum + c.total, 0);
    const totalPagadoHoy = pagadosHoy.reduce((sum, c) => sum + c.total, 0);
    
    const pendientesTotalElement = document.getElementById('creditos-pendientes-total');
    const pendientesCountElement = document.getElementById('creditos-pendientes-count');
    const pagadosHoyElement = document.getElementById('creditos-pagados-hoy');
    const pagadosCountElement = document.getElementById('creditos-pagados-count');
    
    if (pendientesTotalElement) {
        pendientesTotalElement.textContent = window.APIModule.formatCurrency(totalPendiente);
    }
    if (pendientesCountElement) {
        pendientesCountElement.textContent = `${pendientes.length} conduces`;
    }
    if (pagadosHoyElement) {
        pagadosHoyElement.textContent = window.APIModule.formatCurrency(totalPagadoHoy);
    }
    if (pagadosCountElement) {
        pagadosCountElement.textContent = `${pagadosHoy.length} facturas`;
    }
}

// Renderizar lista de conduces
function renderConducesList(conduces) {
    const container = document.getElementById('conduces-list');
    if (!container) return;
    
    if (conduces.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h3>No hay conduces</h3>
                <p>No se encontraron conduces para mostrar.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = conduces.map(conduce => createConduceCard(conduce)).join('');
}

// Crear tarjeta de conduce
function createConduceCard(conduce) {
    const fecha = new Date(conduce.fechaCreacion);
    const fechaStr = fecha.toLocaleDateString('es-CO');
    const esFiscal = conduce.esComprobanteFiscal || false;
    
    // Obtener o calcular el desglose de totales
    let subtotal = conduce.subtotal;
    let itbis = conduce.itbis || conduce.impuesto; // Compatibilidad con ambos nombres
    
    // Si no tenemos los datos del servidor, calcular a partir del total
    if ((!subtotal || !itbis) && conduce.total) {
        if (esFiscal) {
            // Para conduces fiscales, calcular subtotal e ITBIS a partir del total
            subtotal = conduce.total / 1.18; // Total / (1 + 0.18)
            itbis = conduce.total - subtotal;
        } else {
            // Para conduces simples, todo es subtotal, ITBIS = 0
            subtotal = conduce.total;
            itbis = 0;
        }
    }
    
    // Asegurar valores por defecto
    subtotal = subtotal || 0;
    itbis = itbis || 0;
    
    // Crear el desglose fiscal (siempre mostrar para claridad)
    const desgloseFiscal = `
        <div class="conduce-desglose-fiscal">
            <div><strong>Subtotal:</strong> ${window.APIModule.formatCurrency(subtotal)}</div>
            <div><strong>ITBIS (18%):</strong> ${window.APIModule.formatCurrency(itbis)}</div>
        </div>
    `;
    
    return `
        <div class="conduce-card">
            <div class="conduce-header">
                <h4>Conduce #${conduce.numero}</h4>
                <div class="conduce-badges">
                    <span class="conduce-estado ${conduce.estado}">${conduce.estado.toUpperCase()}</span>
                    ${esFiscal ? 
                        '<span class="conduce-tipo-badge fiscal">📄 FISCAL</span>' : 
                        '<span class="conduce-tipo-badge simple">🧾 SIMPLE</span>'
                    }
                </div>
            </div>
            <div class="conduce-info">
                <div><strong>Cliente:</strong> ${conduce.cliente?.nombre || 'Cliente no encontrado'}</div>
                <div><strong>Fecha:</strong> ${fechaStr}</div>
                ${desgloseFiscal}
                <div><strong>Total:</strong> ${window.APIModule.formatCurrency(conduce.total)}</div>
                <div><strong>Productos:</strong> ${conduce.productos?.length || 0} items</div>
            </div>
            <div class="conduce-productos">
                ${(conduce.productos || []).map(p => 
                    `${p.cantidad}x ${p.descripcion} - ${window.APIModule.formatCurrency(p.total)}`
                ).join('<br>')}
            </div>
            <div class="conduce-actions">
                <button class="btn-action" onclick="verConducePDF('${conduce._id}')" title="Ver PDF">
                    📄 PDF
                </button>
                <button class="btn-action" onclick="compartirConduce(${JSON.stringify(conduce).replace(/"/g, '&quot;')})" title="Compartir PDF">
                    📤 Compartir
                </button>
                ${conduce.estado === 'pendiente' ? `
                    <button class="btn-action danger" onclick="anularConduce('${conduce._id}')" title="Anular">
                        ❌ Anular
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// Actualizar filtros de clientes
function updateClientFilters(clientes) {
    const clientesCredito = clientes.filter(c => c.creditoHabilitado);
    
    // Filtro en la pestaña de créditos
    const filtroCliente = document.getElementById('filtro-cliente-credito');
    if (filtroCliente) {
        filtroCliente.innerHTML = '<option value="">Todos los clientes</option>' +
            clientesCredito.map(cliente => 
                `<option value="${cliente._id}">${cliente.nombre}</option>`
            ).join('');
    }
    
    // Selector en modal de conduce
    const selectConduce = document.getElementById('conduce-cliente');
    if (selectConduce) {
        selectConduce.innerHTML = '<option value="">Seleccione un cliente</option>' +
            clientesCredito.map(cliente => 
                `<option value="${cliente._id}">${cliente.nombre}</option>`
            ).join('');
    }
    
    // Selector en modal de pago
    const selectPago = document.getElementById('pago-cliente');
    if (selectPago) {
        selectPago.innerHTML = '<option value="">Seleccione un cliente</option>' +
            clientesCredito.map(cliente => {
                const saldo = cliente.saldoPendiente || 0;
                return `<option value="${cliente._id}">${cliente.nombre} - Saldo: ${window.APIModule.formatCurrency(saldo)}</option>`;
            }).join('');
    }
}

// Filtrar créditos
async function filtrarCreditos() {
    const estadoFiltro = document.getElementById('filtro-estado-credito')?.value;
    const clienteFiltro = document.getElementById('filtro-cliente-credito')?.value;
    
    try {
        // Construir parámetros de consulta
        const params = new URLSearchParams();
        
        if (estadoFiltro) {
            params.set('estado', estadoFiltro);
        } else {
            params.set('incluirTodos', 'true');
        }
        
        if (clienteFiltro) {
            params.set('cliente', clienteFiltro);
        }
        
        console.log('[CREDITOS] Filtrando con parámetros:', params.toString());
        
        // Hacer petición al backend con los filtros
        const response = await fetch(`${window.APIModule.API_BASE}/conduces?${params.toString()}`);
        const conduces = await response.json();
        
        console.log(`[CREDITOS] Conduces filtrados: ${conduces.length}`);
        
        // Actualizar la vista con los resultados filtrados
        renderConducesList(conduces);
        
        // Actualizar el resumen solo si no hay filtros específicos
        if (!estadoFiltro && !clienteFiltro) {
            updateCreditosSummary(conduces);
        }
        
    } catch (error) {
        console.error('[CREDITOS][ERROR] al filtrar:', error);
        window.notify.error('Error al filtrar los créditos. Inténtalo nuevamente.');
    }
}

// Ver conduce en PDF
function verConducePDF(conduceId) {
    window.open(`${window.APIModule.API_BASE}/conduces/${conduceId}/pdf`, '_blank');
}

// Función para compartir conduce
async function compartirConduce(conduce) {
    try {
        window.APIModule.showLoading(true);
        
        const response = await fetch(`${window.APIModule.API_BASE}/conduces/${conduce._id}/pdf`);
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        
        // Verificar si el navegador soporta Web Share API
        if (navigator.share && navigator.canShare) {
            // Crear un archivo para compartir
            const file = new File([blob], `conduce-${conduce.numero || conduce._id}.pdf`, {
                type: 'application/pdf'
            });
            
            // Verificar si se puede compartir archivos
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: `Conduce #${conduce.numero || conduce._id}`,
                    text: `Conduce de ${conduce.cliente?.nombre || 'Cliente'} - Total: ${window.APIModule.formatCurrency(conduce.total)}`,
                    files: [file]
                });
                
                window.notify.success('Conduce compartido exitosamente');
                return;
            }
        }
        
        // Fallback: descargar el PDF si no se puede compartir
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conduce-${conduce.numero || conduce._id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        window.notify.info('PDF descargado. Puedes compartirlo manualmente desde tu carpeta de descargas.');
        
    } catch (error) {
        console.error('Error compartiendo conduce:', error);
        window.notify.error(`Error al compartir conduce: ${error.message}`);
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Anular conduce
async function anularConduce(conduceId) {
    try {
        // Buscar información del conduce para mostrar en el modal
        const conduces = window.StateModule.state.conduces || [];
        const conduce = conduces.find(c => c._id === conduceId);
        const clienteNombre = conduce?.cliente?.nombre || 'Cliente desconocido';
        const conduceTotal = conduce?.total ? window.APIModule.formatCurrency(conduce.total) : '$0.00';
        
        // Verificar si elegantPrompt está disponible
        let motivo;
        
        if (window.elegantPrompt) {
            motivo = await window.elegantPrompt(
                `¿Está seguro que desea anular el conduce del cliente <strong>${clienteNombre}</strong> por un valor de <strong>${conduceTotal}</strong>?<br><br>Por favor, ingrese el motivo de la anulación:`,
                '⚠️ Anular Conduce a Crédito',
                'Ej: Error en pedido, cliente canceló, producto no disponible, etc.',
                'anulacion'
            );
        } else {
            // Fallback al prompt nativo si elegantPrompt no está disponible
            motivo = prompt(
                `Anular conduce de ${clienteNombre} (${conduceTotal})\n\nMotivo de anulación:`, 
                'Ej: Error en pedido, cliente canceló, etc.'
            );
        }
        
        // Validar que se ingresó un motivo
        if (!motivo || motivo.trim() === '') {
            console.log('[CREDITOS] Anulación cancelada - no se proporcionó motivo');
            return;
        }
        
        // Validar longitud mínima del motivo
        if (motivo.trim().length < 10) {
            window.notify.warning('El motivo debe tener al menos 10 caracteres');
            return;
        }
        
        // Mostrar confirmación adicional para operaciones críticas
        const confirmarAnulacion = await window.elegantConfirm(
            `¿Confirma que desea anular este conduce?\n\nMotivo: "${motivo.trim()}"`,
            'Confirmar Anulación',
            'Esta acción no se puede deshacer'
        );
        
        if (!confirmarAnulacion) {
            console.log('[CREDITOS] Anulación cancelada por el usuario');
            return;
        }
        
        // Proceder con la anulación
        window.APIModule.showLoading(true, 'Anulando conduce...');
        
        const response = await fetch(`${window.APIModule.API_BASE}/conduces/${conduceId}/anular`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ motivo: motivo.trim() })
        });
    
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al anular conduce');
        }
        
        const resultado = await response.json();
        
        // Mostrar mensaje de éxito con detalles
        window.notify.success(`Conduce anulado exitosamente\nMotivo: ${motivo.trim()}`);
        
        // Recargar la lista de créditos
        await loadCreditos();
        
        console.log('[CREDITOS] ✅ Conduce anulado exitosamente:', {
            conduceId,
            motivo: motivo.trim(),
            cliente: clienteNombre
        });
        
    } catch (error) {
        console.error('[CREDITOS] ❌ Error anulando conduce:', error);
        window.notify.error(`Error al anular conduce: ${error.message}`);
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Configurar modal de conduce
async function setupConduceModal() {
    try {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[CREDITOS-${timestamp}] === CONFIGURANDO MODAL DE CONDUCE ===`);
        
        // Verificar que el modal está realmente abierto y los elementos existen
        const modal = document.getElementById('modal');
        const selectElement = document.getElementById('conduce-cliente');
        
        console.log(`[CREDITOS-${timestamp}] Modal encontrado:`, !!modal);
        console.log(`[CREDITOS-${timestamp}] Select elemento encontrado:`, !!selectElement);
        
        if (!selectElement) {
            console.error(`[CREDITOS-${timestamp}] ELEMENTO conduce-cliente NO ENCONTRADO!`);
            window.notify.error('Error: No se puede configurar el modal');
            return;
        }
        
        // Asegurar que tenemos los clientes cargados
        console.log(`[CREDITOS-${timestamp}] Clientes en state:`, window.StateModule.state.clientes?.length || 0);
        
        if (!window.StateModule.state.clientes || window.StateModule.state.clientes.length === 0) {
            console.log(`[CREDITOS-${timestamp}] Cargando clientes desde API...`);
            if (window.ClientesModule) {
                await window.ClientesModule.cargarClientes();
            }
            console.log(`[CREDITOS-${timestamp}] Después de cargar: `, window.StateModule.state.clientes?.length || 0);
        }
        
        // Verificar que realmente tenemos clientes
        if (!window.StateModule.state.clientes || window.StateModule.state.clientes.length === 0) {
            console.warn(`[CREDITOS-${timestamp}] NO HAY CLIENTES DISPONIBLES`);
            selectElement.innerHTML = '<option value="">No hay clientes disponibles</option>';
            window.notify.warning('No hay clientes registrados');
            return;
        }
        
        // Configurar las opciones del select
        console.log(`[CREDITOS-${timestamp}] Configurando ${window.StateModule.state.clientes.length} clientes...`);
        
        const opciones = ['<option value="">Seleccione un cliente</option>'];
        
        window.StateModule.state.clientes.forEach((cliente, index) => {
            const credito = cliente.creditoHabilitado ? ' ✅' : ' ❌';
            const limite = cliente.limiteCredito || 0;
            opciones.push(`<option value="${cliente._id}">${cliente.nombre}${credito} (Límite: ${window.APIModule.formatCurrency(limite)})</option>`);
            console.log(`[CREDITOS-${timestamp}] Cliente ${index + 1}: ${cliente.nombre}, Crédito: ${cliente.creditoHabilitado}, ID: ${cliente._id}`);
        });
        
        selectElement.innerHTML = opciones.join('');
        console.log(`[CREDITOS-${timestamp}] ✅ Modal configurado exitosamente con ${window.StateModule.state.clientes.length} clientes`);
        
        // Configurar event listeners para el producto inicial
        setupProductoConduceEventListeners();
        
        // Configurar event listener para comprobante fiscal
        const comprobanteFiscalCheckbox = document.getElementById('conduce-comprobante-fiscal');
        if (comprobanteFiscalCheckbox) {
            comprobanteFiscalCheckbox.addEventListener('change', () => {
                console.log('📋 Comprobante fiscal conduce cambió:', comprobanteFiscalCheckbox.checked);
                calcularTotalConduce();
            });
        }
        
        // Inicializar cálculos
        calcularTotalConduce();
        
    } catch (error) {
        console.error('[CREDITOS] ❌ ERROR configurando modal de conduce:', error);
        window.notify.error('Error cargando clientes: ' + error.message);
    }
}

// Configurar event listeners para productos en conduce
function setupProductoConduceEventListeners() {
    // Configurar event listeners para todos los productos existentes
    const productos = document.querySelectorAll('#productos-conduce .producto-item');
    productos.forEach(producto => {
        const cantidadInput = producto.querySelector('.producto-cantidad');
        const precioInput = producto.querySelector('.producto-precio');
        
        if (cantidadInput && precioInput) {
            // Remover listeners existentes para evitar duplicados
            cantidadInput.removeEventListener('input', calcularTotalConduce);
            precioInput.removeEventListener('input', calcularTotalConduce);
            
            // Agregar nuevos listeners
            cantidadInput.addEventListener('input', calcularTotalConduce);
            precioInput.addEventListener('input', calcularTotalConduce);
            
            console.log('🔧 Event listeners configurados para producto');
        }
    });
}

// Función para agregar producto al conduce
function agregarProductoConduce() {
    const productosContainer = document.getElementById('productos-conduce');
    if (!productosContainer) return;
    
    const nuevoProducto = document.createElement('div');
    nuevoProducto.className = 'producto-item';
    nuevoProducto.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <input type="text" placeholder="Descripción *" name="descripcion" class="producto-descripcion" required>
            </div>
            <div class="form-group">
                <input type="number" placeholder="Cant." name="cantidad" class="producto-cantidad" min="1" value="1" required>
            </div>
            <div class="form-group">
                <input type="number" placeholder="Precio" name="precio" class="producto-precio" step="0.01" min="0" required>
            </div>
            <div class="form-group">
                <input type="number" placeholder="Total" name="total" class="producto-total" readonly>
            </div>
            <button type="button" class="btn-danger btn-sm" onclick="removerProductoConduce(this)">✕</button>
        </div>
    `;
    
    productosContainer.appendChild(nuevoProducto);
    
    // Configurar event listeners para el nuevo producto
    const cantidadInput = nuevoProducto.querySelector('.producto-cantidad');
    const precioInput = nuevoProducto.querySelector('.producto-precio');
    
    if (cantidadInput && precioInput) {
        cantidadInput.addEventListener('input', calcularTotalConduce);
        precioInput.addEventListener('input', calcularTotalConduce);
    }
    
    // Enfocar en la descripción del nuevo producto
    nuevoProducto.querySelector('.producto-descripcion').focus();
}

// Función para remover producto del conduce
function removerProductoConduce(boton) {
    const productos = document.querySelectorAll('#productos-conduce .producto-item');
    if (productos.length > 1) {
        boton.closest('.producto-item').remove();
        calcularTotalConduce();
    } else {
        window.notify.warning('Debe haber al menos un producto en el conduce');
    }
}

// Calcular total del conduce
function calcularTotalConduce() {
    let subtotalBruto = 0;
    
    const productos = document.querySelectorAll('#productos-conduce .producto-item');
    productos.forEach(item => {
        const cantidad = parseFloat(item.querySelector('.producto-cantidad')?.value) || 0;
        const precio = parseFloat(item.querySelector('.producto-precio')?.value) || 0;
        const totalProducto = cantidad * precio;
        
        // Actualizar total del producto individual
        const totalInput = item.querySelector('.producto-total');
        if (totalInput) {
            if (!isNaN(totalProducto) && isFinite(totalProducto)) {
                totalInput.value = totalProducto.toFixed(2);
                subtotalBruto += totalProducto;
            } else {
                totalInput.value = '0.00';
            }
        }
    });
    
    // Verificar si es comprobante fiscal
    const esComprobanteFiscal = document.getElementById('conduce-comprobante-fiscal')?.checked || false;
    
    // Calcular ITBIS solo si es comprobante fiscal
    const itbis = esComprobanteFiscal ? subtotalBruto * 0.18 : 0;
    const totalFinal = subtotalBruto + itbis;
    
    console.log('💰 Cálculos Conduce:', {
        subtotalBruto: subtotalBruto,
        esComprobanteFiscal: esComprobanteFiscal,
        itbis: itbis,
        totalFinal: totalFinal
    });
    
    // Función para actualizar elementos del DOM de forma segura
    const updateElementSafe = (id, value) => {
        const element = document.getElementById(id);
        if (element && !isNaN(value) && isFinite(value)) {
            element.textContent = window.APIModule.formatCurrency(value);
            console.log(`Actualizando ${id}:`, window.APIModule.formatCurrency(value));
        } else if (element) {
            console.warn(`⚠️ No se pudo actualizar ${id}, valor inválido:`, value);
        } else {
            console.warn(`⚠️ Elemento ${id} no encontrado en el DOM`);
        }
    };

    // Actualizar totales en el modal
    updateElementSafe('conduce-subtotal', subtotalBruto);
    updateElementSafe('conduce-impuesto', itbis);
    updateElementSafe('conduce-total', totalFinal);
}

// Guardar conduce
async function guardarConduce(event) {
    event.preventDefault();
    
    try {
        const clienteId = document.getElementById('conduce-cliente').value;
        const esComprobanteFiscal = document.getElementById('conduce-comprobante-fiscal')?.checked || false;
        
        if (!clienteId) {
            window.notify.error('Debe seleccionar un cliente');
            return;
        }
        
        // Recopilar productos
        const productos = [];
        const productosItems = document.querySelectorAll('#productos-conduce .producto-item');
        
        productosItems.forEach(item => {
            const descripcion = item.querySelector('.producto-descripcion')?.value?.trim();
            const cantidad = parseFloat(item.querySelector('.producto-cantidad')?.value) || 0;
            const precio = parseFloat(item.querySelector('.producto-precio')?.value) || 0;
            
            if (descripcion && cantidad > 0 && precio > 0) {
                const totalProducto = cantidad * precio;
                if (!isNaN(totalProducto) && isFinite(totalProducto)) {
                    productos.push({
                        descripcion,
                        cantidad: Number(cantidad),
                        precioUnitario: Number(precio),
                        total: Number(totalProducto.toFixed(2))
                    });
                }
            }
        });
        
        if (productos.length === 0) {
            window.notify.error('Debe agregar al menos un producto válido');
            return;
        }
        
        // Calcular totales
        const subtotalBruto = productos.reduce((sum, p) => sum + p.total, 0);
        const itbis = esComprobanteFiscal ? subtotalBruto * 0.18 : 0;
        const totalFinal = subtotalBruto + itbis;
        
        const conduceData = {
            clienteId,
            productos,
            subtotal: Number(subtotalBruto.toFixed(2)),
            impuesto: Number(itbis.toFixed(2)),
            total: Number(totalFinal.toFixed(2)),
            esComprobanteFiscal,
            fechaCreacion: window.StateModule.state.fechaSeleccionada || window.StateModule.getLocalDateString()
        };
        
        console.log('📋 Datos del conduce a enviar:', {
            ...conduceData,
            subtotalCalculado: subtotalBruto,
            itbisCalculado: itbis,
            totalCalculado: totalFinal
        });
        
        window.APIModule.showLoading(true);
        
        const response = await fetch(`${window.APIModule.API_BASE}/conduces`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(conduceData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Error del servidor:', errorData);
            throw new Error(errorData.error || errorData.message || `Error ${response.status}: ${response.statusText}`);
        }
        
        const conduce = await response.json();
        console.log('✅ Conduce generado exitosamente:', conduce);
        
        window.closeModal();
        window.notify.success('Conduce generado exitosamente');
        
        // Recargar datos de créditos
        await loadCreditos();
        
        // Mostrar modal de éxito si existe
        if (window.ModalesModule?.mostrarModalExitoConduce) {
            window.ModalesModule.mostrarModalExitoConduce(conduce);
        }
        
        // Actualizar datos del día
        if (window.APIModule.loadInitialData) {
            window.APIModule.loadInitialData();
        }
        
    } catch (error) {
        console.error('❌ Error guardando conduce:', error);
        window.notify.error(`Error al generar conduce: ${error.message}`);
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Configurar modal de pagar créditos
async function setupPagarCreditosModal() {
    try {
        console.log('[CREDITOS] Configurando modal de pagar créditos...');
        
        // Asegurar que tenemos los clientes cargados
        if (!window.StateModule.state.clientes || window.StateModule.state.clientes.length === 0) {
            console.log('[CREDITOS] Cargando clientes...');
            if (window.ClientesModule) {
                await window.ClientesModule.cargarClientes();
            }
        }
        
        console.log('[CREDITOS] Clientes disponibles:', window.StateModule.state.clientes?.length || 0);
        
        // Verificar que realmente tenemos clientes
        if (!window.StateModule.state.clientes || window.StateModule.state.clientes.length === 0) {
            console.warn('[CREDITOS] No se pudieron cargar los clientes');
            window.notify.error('No se pudieron cargar los clientes. Verifique su conexión.');
            return;
        }
        
        // Cargar todos los clientes primero para debugging
        const selectCliente = document.getElementById('pago-cliente');
        if (selectCliente) {
            console.log('[CREDITOS] Configurando select de clientes para pago...');
            
            selectCliente.innerHTML = '<option value="">Seleccione un cliente</option>' +
                window.StateModule.state.clientes.map(cliente => {
                    const credito = cliente.creditoHabilitado ? ' (Crédito)' : ' (Sin crédito)';
                    const saldo = cliente.saldoPendiente || 0;
                    return `<option value="${cliente._id}">${cliente.nombre}${credito} - Saldo: ${window.APIModule.formatCurrency(saldo)}</option>`;
                }).join('');
                
            console.log('[CREDITOS] Select de pago configurado con', window.StateModule.state.clientes.length, 'clientes');
        } else {
            console.error('[CREDITOS] No se encontró el elemento pago-cliente');
        }
        
        // Resetear campos de conduces y resumen
        const conducesContainer = document.getElementById('conduces-pendientes');
        if (conducesContainer) conducesContainer.classList.add('hidden');
        const conducesList = document.getElementById('conduces-list-pago');
        if (conducesList) conducesList.innerHTML = '';
        
        // Resetear contadores
        const countElement = document.getElementById('conduces-seleccionados-count');
        if (countElement) countElement.textContent = '0';
        const totalElement = document.getElementById('total-pagar');
        if (totalElement) totalElement.textContent = window.APIModule.formatCurrency(0);
        const btn = document.getElementById('btn-pagar-creditos');
        if (btn) btn.disabled = true;
        
        console.log('[CREDITOS] Modal de pagar créditos configurado exitosamente');
        
    } catch (error) {
        console.error('[CREDITOS] Error configurando modal de pagar créditos:', error);
        window.notify.error('Error cargando clientes: ' + error.message);
    }
}

// Cargar conduces por cliente para pago
async function cargarConducesPorCliente(clienteId) {
    try {
        window.APIModule.showLoading(true);
        
        const response = await fetch(`${window.APIModule.API_BASE}/conduces?cliente=${clienteId}&estado=pendiente`);
        const conduces = await response.json();
        
        const container = document.getElementById('conduces-list-pago');
        const conducesContainer = document.getElementById('conduces-pendientes');
        
        if (conduces.length === 0) {
            container.innerHTML = '<div class="no-data">Este cliente no tiene conduces pendientes</div>';
            if (conducesContainer) conducesContainer.classList.remove('hidden');
            return;
        }
        
        container.innerHTML = conduces.map(conduce => createConduceCheckboxItem(conduce)).join('');
        if (conducesContainer) conducesContainer.classList.remove('hidden');
        
        // Configurar event listeners para checkboxes
        setupConduceCheckboxListeners();
        
    } catch (error) {
        console.error('Error cargando conduces del cliente:', error);
        window.notify.error('Error cargando conduces del cliente');
    } finally {
        window.APIModule.showLoading(false);
    }
}

// Cargar conduces pendientes para pago (llamada desde HTML)
async function cargarConducesPendientes() {
    const clienteId = document.getElementById('pago-cliente').value;
    const conducesContainer = document.getElementById('conduces-pendientes');
    
    if (!clienteId) {
        if (conducesContainer) {
            conducesContainer.classList.add('hidden');
        }
        // Resetear contadores
        const countElement = document.getElementById('conduces-seleccionados-count');
        const totalElement = document.getElementById('total-pagar');
        if (countElement) countElement.textContent = '0';
        if (totalElement) totalElement.textContent = window.APIModule.formatCurrency(0);
        return;
    }
    
    await cargarConducesPorCliente(clienteId);
}

// Crear item de conduce con checkbox
function createConduceCheckboxItem(conduce) {
    const fecha = new Date(conduce.fechaCreacion).toLocaleDateString('es-CO');
    const esFiscal = conduce.esComprobanteFiscal || false;
    
    // Obtener o calcular el desglose de totales
    let subtotal = conduce.subtotal;
    let itbis = conduce.itbis || conduce.impuesto; // Compatibilidad con ambos nombres
    
    // Si no tenemos los datos del servidor, calcular a partir del total
    if ((!subtotal || !itbis) && conduce.total) {
        if (esFiscal) {
            // Para conduces fiscales, calcular subtotal e ITBIS a partir del total
            subtotal = conduce.total / 1.18; // Total / (1 + 0.18)
            itbis = conduce.total - subtotal;
        } else {
            // Para conduces simples, todo es subtotal, ITBIS = 0
            subtotal = conduce.total;
            itbis = 0;
        }
    }
    
    // Asegurar valores por defecto
    subtotal = subtotal || 0;
    itbis = itbis || 0;
    
    return `
        <div class="conduce-item" data-es-fiscal="${esFiscal}">
            <label class="conduce-checkbox-label">
                <input type="checkbox" id="conduce-${conduce._id}">
                <div class="conduce-info-pago">
                    <div class="conduce-header-pago">
                        <span class="conduce-numero">Conduce #${conduce.numero}</span>
                        <span class="conduce-total">${window.APIModule.formatCurrency(conduce.total)}</span>
                    </div>
                    <div class="conduce-meta-pago">
                        <span class="conduce-fecha">📅 ${fecha}</span>
                        ${esFiscal ? 
                            '<span class="conduce-fiscal-badge">📄 FISCAL</span>' : 
                            '<span class="conduce-simple-badge">🧾 SIMPLE</span>'
                        }
                    </div>
                    <div class="conduce-desglose-pago">
                        <div class="desglose-item">
                            <span>Subtotal:</span>
                            <span>${window.APIModule.formatCurrency(subtotal)}</span>
                        </div>
                        <div class="desglose-item">
                            <span>ITBIS:</span>
                            <span>${window.APIModule.formatCurrency(itbis)}</span>
                        </div>
                    </div>
                    <div class="conduce-productos-resumen">
                        ${conduce.productos.map(p => `${p.cantidad}x ${p.descripcion}`).join(', ')}
                    </div>
                </div>
            </label>
        </div>
    `;
}

// Configurar listeners para checkboxes de conduces
function setupConduceCheckboxListeners() {
    const checkboxes = document.querySelectorAll('#conduces-list-pago input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            validateFiscalMix();
            actualizarSeleccionConduces();
        });
    });
}

// Validar que no se mezclen conduces fiscales y simples
function validateFiscalMix() {
    const checkboxes = document.querySelectorAll('#conduces-list-pago input[type="checkbox"]:checked');
    const conducesFiscales = [];
    const conducesSimples = [];
    
    checkboxes.forEach(checkbox => {
        const conduceItem = checkbox.closest('.conduce-item');
        const esFiscal = conduceItem.dataset.esFiscal === 'true';
        
        if (esFiscal) {
            conducesFiscales.push(checkbox);
        } else {
            conducesSimples.push(checkbox);
        }
    });
    
    const hayMezcla = conducesFiscales.length > 0 && conducesSimples.length > 0;
    const btnPagar = document.getElementById('btn-pagar-creditos');
    const warningDiv = document.getElementById('fiscal-mix-warning') || createFiscalWarning();
    
    if (hayMezcla) {
        // Mostrar advertencia y deshabilitar botón
        warningDiv.style.display = 'block';
        warningDiv.innerHTML = `
            <div class="warning-content">
                ⚠️ <strong>Atención:</strong> No se pueden mezclar conduces fiscales y simples en la misma factura.
                <br>
                <small>Selecciona solo conduces del mismo tipo para continuar.</small>
            </div>
        `;
        if (btnPagar) btnPagar.disabled = true;
        
        // Agregar clase de error a los checkboxes mezclados
        checkboxes.forEach(cb => {
            cb.closest('.conduce-item').classList.add('mixed-error');
        });
    } else {
        // Ocultar advertencia y permitir continuar
        warningDiv.style.display = 'none';
        
        // Remover clase de error
        document.querySelectorAll('.conduce-item').forEach(item => {
            item.classList.remove('mixed-error');
        });
        
        // El botón se habilitará/deshabilitará en actualizarSeleccionConduces
    }
    
    return !hayMezcla;
}

// Crear elemento de advertencia fiscal
function createFiscalWarning() {
    const warningDiv = document.createElement('div');
    warningDiv.id = 'fiscal-mix-warning';
    warningDiv.className = 'fiscal-warning';
    warningDiv.style.display = 'none';
    
    const conducesList = document.getElementById('conduces-list-pago');
    if (conducesList && conducesList.parentNode) {
        conducesList.parentNode.insertBefore(warningDiv, conducesList.nextSibling);
    }
    
    return warningDiv;
}

// Actualizar selección de conduces
function actualizarSeleccionConduces() {
    const checkboxes = document.querySelectorAll('#conduces-list-pago input[type="checkbox"]:checked');
    const count = checkboxes.length;
    
    let total = 0;
    checkboxes.forEach(checkbox => {
        const conduceItem = checkbox.closest('.conduce-item');
        const totalText = conduceItem.querySelector('.conduce-total').textContent;
        total += parseFloat(totalText.replace(/[\$,]/g, ''));
    });
    
    const countElement = document.getElementById('conduces-seleccionados-count');
    const totalElement = document.getElementById('total-pagar');
    const btnElement = document.getElementById('btn-pagar-creditos');
    
    if (countElement) countElement.textContent = count;
    if (totalElement) totalElement.textContent = window.APIModule.formatCurrency(total);
    
    // Solo habilitar el botón si hay conduces seleccionados Y no hay mezcla fiscal
    const isValidSelection = count > 0 && validateFiscalMix();
    if (btnElement) btnElement.disabled = !isValidSelection;
}

// Procesar pago de créditos
async function pagarCreditos(event) {
    event.preventDefault();
    console.log('🔄 Iniciando proceso de pago de créditos...');
    
    const btn = document.getElementById('btn-pagar-creditos');
    if (btn) btn.disabled = true;
    
    try {
        const clienteId = document.getElementById('pago-cliente').value;
        const checkboxes = document.querySelectorAll('#conduces-list-pago input[type="checkbox"]:checked');
        const generarFacturaRNC = document.getElementById('generar-factura-rnc')?.checked || false;
        const metodoPago = document.getElementById('metodo-pago-conduce')?.value || 'efectivo';
        const conducesIds = Array.from(checkboxes).map(cb => cb.id.replace('conduce-', ''));
        
        console.log('📋 Datos del pago:', { 
            clienteId, 
            conducesIds, 
            generarFacturaRNC, 
            metodoPago,
            checkboxesCount: checkboxes.length 
        });
        
        if (!clienteId) {
            window.notify.error('Debe seleccionar un cliente');
            if (btn) btn.disabled = false;
            return;
        }
        
        if (conducesIds.length === 0) {
            window.notify.error('Debe seleccionar al menos un conduce');
            if (btn) btn.disabled = false;
            return;
        }
        
        // Validar que no se mezclen tipos fiscales
        if (!validateFiscalMix()) {
            window.notify.error('No se pueden mezclar conduces fiscales y simples en la misma factura');
            if (btn) btn.disabled = false;
            return;
        }
        
        console.log('⏳ Enviando solicitud de pago al servidor...');
        window.APIModule.showLoading(true);
        
        // Crear factura agrupando los conduces
        const facturaData = {
            clienteId,
            conducesIds,
            tipoComprobante: generarFacturaRNC ? 'FACTURA' : 'BOLETA',
            requiereRNC: generarFacturaRNC,
            esComprobanteFiscal: generarFacturaRNC,
            metodoPago: metodoPago,
            fechaEmision: window.StateModule.state.fechaSeleccionada
        };
        
        console.log('📤 Enviando datos al servidor:', facturaData);
        
        const response = await fetch(`${window.APIModule.API_BASE}/facturas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(facturaData)
        });
        
        console.log('Respuesta del servidor:', response.status, response.statusText);
        
        if (!response.ok) {
            let errorMsg = 'Error al procesar el pago';
            try {
                const error = await response.json();
                errorMsg = error.error || errorMsg;
                console.error('Error del servidor:', error);
            } catch(e) {}
            window.notify.error(errorMsg);
            if (btn) btn.disabled = false;
            return;
        }
        
        const factura = await response.json();
        console.log('Factura creada:', factura);
        
        window.closeModal();
        window.notify.success('Pago procesado exitosamente');
        
        console.log('[PAGO-CREDITOS] Recargando datos después del pago...');
        
        // Pequeño delay para asegurar consistencia en la base de datos
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await loadCreditos();
        console.log('[PAGO-CREDITOS] Datos recargados exitosamente');
        
        // Preguntar si quiere descargar la factura
        if (factura && factura._id) {
            const download = await window.elegantConfirm(
                '¿Desea descargar la factura en PDF?',
                'Descargar Factura'
            );
            if (download && window.FacturasModule) {
                window.FacturasModule.descargarFacturaPDF(factura._id);
            }
        }
        
    } catch (error) {
        console.error('Error procesando pago:', error);
        window.notify.error(error.message || 'Error inesperado al procesar el pago');
    } finally {
        window.APIModule.showLoading(false);
        if (btn) btn.disabled = false;
    }
}

// Exportar funciones del módulo
window.CreditosModule = {
    loadCreditos,
    updateCreditosSummary,
    renderConducesList,
    updateClientFilters,
    filtrarCreditos,
    verConducePDF,
    compartirConduce,
    anularConduce,
    setupConduceModal,
    setupProductoConduceEventListeners,
    calcularTotalConduce,
    agregarProductoConduce,
    removerProductoConduce,
    guardarConduce,
    setupPagarCreditosModal,
    cargarConducesPorCliente,
    cargarConducesPendientes,
    validateFiscalMix,
    actualizarSeleccionConduces,
    pagarCreditos
};

// Exponer funciones globalmente para compatibilidad
window.loadCreditos = loadCreditos;
window.filtrarCreditos = filtrarCreditos;
window.verConducePDF = verConducePDF;
window.compartirConduce = compartirConduce;
window.anularConduce = anularConduce;
window.setupConduceModal = setupConduceModal;
window.setupPagarCreditosModal = setupPagarCreditosModal;
window.cargarConducesPorCliente = cargarConducesPorCliente;
window.cargarConducesPendientes = cargarConducesPendientes;
window.validateFiscalMix = validateFiscalMix;
window.actualizarSeleccionConduces = actualizarSeleccionConduces;
window.pagarCreditos = pagarCreditos;
window.agregarProductoConduce = agregarProductoConduce;
window.removerProductoConduce = removerProductoConduce;
window.guardarConduce = guardarConduce;
