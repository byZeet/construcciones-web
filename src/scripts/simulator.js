// Lógica del simulador de presupuesto con estética de "App"
const updatePrice = () => {
    let total = 0;
    const summaryList = document.getElementById('summary-list');
    const subtotalVal = document.getElementById('subtotal-val');
    const ivaVal = document.getElementById('iva-val');
    const totalPriceElement = document.getElementById('total-price');
    const mainDisplay = document.getElementById('main-model-display');
    
    if (!summaryList || !totalPriceElement) return;

    summaryList.innerHTML = '';
    let selectedItems = []; // Para el mensaje de WhatsApp y PDF

    const addSummaryItem = (label, price) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${label}</span> <span>+${parseInt(price).toLocaleString()}€</span>`;
        summaryList.appendChild(li);
        selectedItems.push(`${label} (+${parseInt(price).toLocaleString()}€)`);
    };

    // 1. Tamaño / Modelo
    const sizeOpt = document.querySelector('input[name="size"]:checked');
    if (sizeOpt) {
        total += parseInt(sizeOpt.value);
        addSummaryItem(sizeOpt.dataset.label, sizeOpt.value);
        if (mainDisplay) mainDisplay.innerText = parseInt(sizeOpt.value).toLocaleString() + '€';
    }

    // 2. Grosor / Aislamiento
    const thicknessOpt = document.getElementById('wood-thickness');
    if (thicknessOpt && thicknessOpt.value !== "0") {
        total += parseInt(thicknessOpt.value);
        addSummaryItem(thicknessOpt.options[thicknessOpt.selectedIndex].dataset.label, thicknessOpt.value);
    }

    // 3. Color
    const colorOpt = document.querySelector('input[name="color"]:checked');
    if (colorOpt && colorOpt.value !== "0") {
        total += parseInt(colorOpt.value);
        addSummaryItem("Tratamiento Color", colorOpt.value);
    }

    // 4. Extras
    const extras = document.querySelectorAll('.extra:checked');
    extras.forEach(extra => {
        total += parseInt(extra.value);
        addSummaryItem(extra.dataset.label, extra.value);
    });

    // Cálculos de Impuestos
    const iva = total * 0.21;
    const finalTotal = total + iva;

    // Actualización de la interfaz
    if (subtotalVal) subtotalVal.innerText = total.toLocaleString() + ' €';
    if (ivaVal) ivaVal.innerText = iva.toLocaleString() + ' €';
    totalPriceElement.innerText = finalTotal.toLocaleString() + ' €';

    // Configurar botones de contacto y descarga
    setupContactButtons(selectedItems, finalTotal);
    setupPDFButton();
};

// Función para generar el mensaje de WhatsApp
const setupContactButtons = (items, total) => {
    const wsBtn = document.querySelector('.btn-app-whatsapp');
    if (!wsBtn) return;

    const phoneNumber = "34653893623"; 
    const message = encodeURIComponent(
        `¡Hola Tayga Construcciones! 👋\n\n` +
        `He realizado una simulación en la web para mi casa de madera:\n` +
        `---------------------------\n` +
        `✅ ${items.join('\n✅ ')}\n` +
        `---------------------------\n` +
        `💰 *Presupuesto Total estimado (con IVA): ${total.toLocaleString()} €*`
    );

    wsBtn.onclick = () => {
        window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
    };
};

// Función para descargar PDF
const setupPDFButton = () => {
    const pdfBtn = document.getElementById('download-pdf');
    if (!pdfBtn) return;

    pdfBtn.onclick = () => {
        const element = document.querySelector('.budget-app-card');
        
        // Creamos un clon para no modificar la interfaz que ve el usuario
        const elementClone = element.cloneNode(true);
        
        // Estilizamos el clon específicamente para el PDF
        elementClone.style.width = "100%";
        elementClone.style.boxShadow = "none";
        elementClone.style.border = "none";
        elementClone.style.padding = "20px";
        
        // Ocultamos los botones de acción en el PDF final
        const actions = elementClone.querySelector('.card-actions');
        if (actions) actions.remove();

        // Creamos un contenedor temporal invisible para renderizar
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.appendChild(elementClone);
        const header = document.createElement('div');
header.innerHTML = `
    <h1 style="color: #1a1f36; font-family: serif; text-transform: uppercase; margin-bottom: 20px; border-bottom: 2px solid #F5E0B7; padding-bottom: 10px;">
        Tayga Construcciones
    </h1>
    <p style="font-size: 10px; color: #888; margin-bottom: 30px;">Presupuesto de Casa de Madera - Válido por 15 días</p>
`;
elementClone.prepend(header);
        document.body.appendChild(container);

        const opt = {
            margin:       [1, 1, 1, 1], // Márgenes de 1cm
            filename:     'Presupuesto_Tayga_Construcciones.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
                scale: 2, 
                logging: false, 
                useCORS: true,
                scrollY: 0, // Evita que si el usuario tiene scroll el PDF salga movido
                scrollX: 0
            },
            jsPDF:        { unit: 'cm', format: 'a4', orientation: 'portrait' }
        };

        // @ts-ignore
        html2pdf().set(opt).from(elementClone).save().then(() => {
            // Limpiamos el clon del documento
            document.body.removeChild(container);
        });
    };
};

// Inicialización
const init = () => {
    const inputs = document.querySelectorAll('#simulator-form input, #simulator-form select');
    inputs.forEach(el => el.addEventListener('change', updatePrice));
    updatePrice();
};

document.addEventListener('astro:page-load', init);
document.addEventListener('DOMContentLoaded', init);