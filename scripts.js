// Variables globales
let splineChart = null;
let currentSplineType = null;

// Inicializar la tabla de entrada
function updateInputTable() {
    const pointCount = parseInt(document.getElementById('pointCount').value);
    const tableBody = document.getElementById('inputTableBody');
    tableBody.innerHTML = '';
    for (let i = 0; i < pointCount; i++) {
        const row = document.createElement('tr');
        const cellIndex = document.createElement('td');
        cellIndex.textContent = i + 1;
        const cellX = document.createElement('td');
        const inputX = document.createElement('input');
        inputX.type = 'number';
        inputX.step = 'any';
        inputX.id = `x${i}`;
        inputX.value = i === 0 ? '0.23' : i === 1 ? '1.22' : i === 2 ? '2.34' : '';
        cellX.appendChild(inputX);
        const cellY = document.createElement('td');
        const inputY = document.createElement('input');
        inputY.type = 'number';
        inputY.step = 'any';
        inputY.id = `y${i}`;
        inputY.value = i === 0 ? '1.15' : i === 1 ? '1.35' : i === 2 ? '1.83' : '';
        cellY.appendChild(inputY);
        row.appendChild(cellIndex);
        row.appendChild(cellX);
        row.appendChild(cellY);
        tableBody.appendChild(row);
    }
}

// Mostrar campos para derivadas
function showDerivativeInputs() {
    document.getElementById('derivativeInputs').style.display = 'block';
    document.getElementById('initialDerivative').focus();
}

// Ocultar campos para derivadas
function hideDerivativeInputs() {
    document.getElementById('derivativeInputs').style.display = 'none';
}

// Cargar ejemplo
function loadExample() {
    document.getElementById('pointCount').value = 4;
    updateInputTable();
    document.getElementById('x0').value = '0.0';
    document.getElementById('y0').value = '1.0';
    document.getElementById('x1').value = '1.0';
    document.getElementById('y1').value = '2.0';
    document.getElementById('x2').value = '2.0';
    document.getElementById('y2').value = '0.5';
    document.getElementById('x3').value = '3.0';
    document.getElementById('y3').value = '1.5';
    hideDerivativeInputs();
}

// Obtener puntos de entrada
function getInputPoints() {
    const pointCount = parseInt(document.getElementById('pointCount').value);
    const points = [];
    for (let i = 0; i < pointCount; i++) {
        const x = parseFloat(document.getElementById(`x${i}`).value);
        const y = parseFloat(document.getElementById(`y${i}`).value);
        if (isNaN(x)) {
            alert(`El valor X del punto ${i+1} no es válido`);
            return null;
        }
        if (isNaN(y)) {
            alert(`El valor Y del punto ${i+1} no es válido`);
            return null;
        }
        points.push({x, y});
    }
    points.sort((a, b) => a.x - b.x);
    for (let i = 1; i < points.length; i++) {
        if (points[i].x === points[i-1].x) {
            alert(`Los valores X deben ser distintos. Hay duplicados en x=${points[i].x}`);
            return null;
        }
    }
    return points;
}

// Calcular splines naturales
function calculateNaturalSplines() {
    currentSplineType = 'natural';
    hideDerivativeInputs();
    calculateSplines();
}

// Calcular splines con derivadas
function calculateDerivativeSplines() {
    const fpa = parseFloat(document.getElementById('initialDerivative').value);
    const fpb = parseFloat(document.getElementById('finalDerivative').value);
    if (isNaN(fpa)) {
        alert('La derivada inicial no es válida');
        return;
    }
    if (isNaN(fpb)) {
        alert('La derivada final no es válida');
        return;
    }
    currentSplineType = 'derivative';
    calculateSplines(fpa, fpb);
}

// Función principal para calcular los splines
function calculateSplines(fpa, fpb) {
    const points = getInputPoints();
    if (!points) return;
    const x = points.map(p => p.x);
    const y = points.map(p => p.y);
    if (x.length < 3) {
        alert("Se necesitan al menos 3 puntos para splines cúbicos");
        return;
    }
    let polynomials, evalPoints, calculationSteps;
    if (currentSplineType === 'derivative') {
        const result = clampedCubicSpline(x, y, fpa, fpb);
        polynomials = result.polynomials;
        evalPoints = result.evalPoints;
        calculationSteps = result.calculationSteps;
    } else {
        const result = naturalCubicSpline(x, y);
        polynomials = result.polynomials;
        evalPoints = result.evalPoints;
        calculationSteps = result.calculationSteps;
    }
    displayResults(polynomials, x, y, calculationSteps);
    drawChart(x, y, evalPoints);
}

// Algoritmo de spline cúbico natural
function naturalCubicSpline(x, y) {
    const n = x.length;
    const calculationSteps = [];
    calculationSteps.push({
        title: "Paso 1: Calcular diferencias h entre puntos",
        content: `h<sub>i</sub> = x<sub>i+1</sub> - x<sub>i</sub>`
    });
    const h = [];
    for (let i = 0; i < n - 1; i++) {
        h.push(x[i+1] - x[i]);
    }
    calculationSteps.push({
        title: "Valores calculados de h:",
        content: `[${h.map(hi => hi.toFixed(4)).join(', ')}]`
    });
    calculationSteps.push({
        title: "Paso 2: Calcular vector α (para condiciones naturales)",
        content: `α<sub>0</sub> = α<sub>n</sub> = 0<br>α<sub>i</sub> = (3/h<sub>i</sub>)(y<sub>i+1</sub> - y<sub>i</sub>) - (3/h<sub>i-1</sub>)(y<sub>i</sub> - y<sub>i-1</sub>) para i = 1,...,n-1`
    });
    const alpha = new Array(n).fill(0);
    for (let i = 1; i < n - 1; i++) {
        alpha[i] = (3/h[i]) * (y[i+1] - y[i]) - (3/h[i-1]) * (y[i] - y[i-1]);
    }
    calculationSteps.push({
        title: "Valores calculados de α:",
        content: `[${alpha.map(a => a.toFixed(4)).join(', ')}]`
    });
    calculationSteps.push({
        title: "Paso 3: Resolver sistema tridiagonal para c (Algoritmo de Thomas)",
        content: `El sistema a resolver es:<br>l<sub>i</sub>c<sub>i</sub> + μ<sub>i</sub>c<sub>i+1</sub> = z<sub>i</sub><br>Donde:<br>l<sub>i</sub> = 2(x<sub>i+1</sub> - x<sub>i-1</sub>) - h<sub>i-1</sub>μ<sub>i-1</sub><br>μ<sub>i</sub> = h<sub>i</sub>/l<sub>i</sub><br>z<sub>i</sub> = (α<sub>i</sub> - h<sub>i-1</sub>z<sub>i-1</sub>)/l<sub>i</sub>`
    });
    const l = new Array(n).fill(1);
    const mu = new Array(n).fill(0);
    const z = new Array(n).fill(0);
    for (let i = 1; i < n - 1; i++) {
        l[i] = 2 * (x[i+1] - x[i-1]) - h[i-1] * mu[i-1];
        mu[i] = h[i] / l[i];
        z[i] = (alpha[i] - h[i-1] * z[i-1]) / l[i];
    }
    calculationSteps.push({
        title: "Vectores intermedios l, μ, z:",
        content: `l = [${l.map(li => li.toFixed(4)).join(', ')}]<br>μ = [${mu.map(m => m.toFixed(4)).join(', ')}]<br>z = [${z.map(zi => zi.toFixed(4)).join(', ')}]`
    });
    const c = new Array(n).fill(0);
    const b = new Array(n).fill(0);
    const d = new Array(n).fill(0);
    for (let j = n - 2; j >= 0; j--) {
        c[j] = z[j] - mu[j] * c[j+1];
        b[j] = (y[j+1] - y[j]) / h[j] - h[j] * (c[j+1] + 2 * c[j]) / 3;
        d[j] = (c[j+1] - c[j]) / (3 * h[j]);
    }
    calculationSteps.push({
        title: "Paso 4: Calcular coeficientes b, c, d",
        content: `Coeficientes calculados:<br>b = [${b.map(bi => bi.toFixed(4)).join(', ')}]<br>c = [${c.map(ci => ci.toFixed(4)).join(', ')}]<br>d = [${d.map(di => di.toFixed(4)).join(', ')}]`
    });
    const polynomials = [];
    for (let i = 0; i < n - 1; i++) {
        polynomials.push({
            a: y[i],
            b: b[i],
            c: c[i],
            d: d[i],
            x0: x[i],
            x1: x[i+1]
        });
    }
    calculationSteps.push({
        title: "Paso 5: Construir polinomios por tramo",
        content: `Se han construido ${polynomials.length} polinomios cúbicos.`
    });
    const evalPoints = generateEvalPoints(polynomials, x);
    return {polynomials, evalPoints, calculationSteps};
}

// Algoritmo de spline cúbico con derivadas
function clampedCubicSpline(x, y, fpa, fpb) {
    const n = x.length;
    const calculationSteps = [];
    calculationSteps.push({
        title: "Paso 1: Calcular diferencias h entre puntos",
        content: `h<sub>i</sub> = x<sub>i+1</sub> - x<sub>i</sub>`
    });
    const h = [];
    for (let i = 0; i < n - 1; i++) {
        h.push(x[i+1] - x[i]);
    }
    calculationSteps.push({
        title: "Valores calculados de h:",
        content: `[${h.map(hi => hi.toFixed(4)).join(', ')}]`
    });
    calculationSteps.push({
        title: "Paso 2: Calcular vector α (para condiciones con derivadas)",
        content: `α<sub>0</sub> = 3((y<sub>1</sub> - y<sub>0</sub>)/h<sub>0</sub> - f'<sub>0</sub>)<br>α<sub>n-1</sub> = 3(f'<sub>n-1</sub> - (y<sub>n-1</sub> - y<sub>n-2</sub>)/h<sub>n-2</sub>)<br>α<sub>i</sub> = (3/h<sub>i</sub>)(y<sub>i+1</sub> - y<sub>i</sub>) - (3/h<sub>i-1</sub>)(y<sub>i</sub> - y<sub>i-1</sub>) para i = 1,...,n-2`
    });
    const alpha = new Array(n).fill(0);
    alpha[0] = 3 * ((y[1] - y[0]) / h[0] - fpa);
    alpha[n-1] = 3 * (fpb - (y[n-1] - y[n-2]) / h[n-2]);
    for (let i = 1; i < n - 1; i++) {
        alpha[i] = (3/h[i]) * (y[i+1] - y[i]) - (3/h[i-1]) * (y[i] - y[i-1]);
    }
    calculationSteps.push({
        title: "Valores calculados de α:",
        content: `[${alpha.map(a => a.toFixed(4)).join(', ')}]`
    });
    calculationSteps.push({
        title: "Paso 3: Resolver sistema tridiagonal para c (Algoritmo de Thomas modificado)",
        content: `El sistema a resolver es:<br>l<sub>0</sub> = 2h<sub>0</sub><br>μ<sub>0</sub> = 0.5<br>z<sub>0</sub> = α<sub>0</sub>/l<sub>0</sub><br>Para i = 1,...,n-2:<br>l<sub>i</sub> = 2(x<sub>i+1</sub> - x<sub>i-1</sub>) - h<sub>i-1</sub>μ<sub>i-1</sub><br>μ<sub>i</sub> = h<sub>i</sub>/l<sub>i</sub><br>z<sub>i</sub> = (α<sub>i</sub> - h<sub>i-1</sub>z<sub>i-1</sub>)/l<sub>i</sub><br>l<sub>n-1</sub> = h<sub>n-2</sub>(2 - μ<sub>n-2</sub>)<br>z<sub>n-1</sub> = (α<sub>n-1</sub> - h<sub>n-2</sub>z<sub>n-2</sub>)/l<sub>n-1</sub>`
    });
    const l = new Array(n).fill(1);
    const mu = new Array(n).fill(0);
    const z = new Array(n).fill(0);
    l[0] = 2 * h[0];
    mu[0] = 0.5;
    z[0] = alpha[0] / l[0];
    for (let i = 1; i < n - 1; i++) {
        l[i] = 2 * (x[i+1] - x[i-1]) - h[i-1] * mu[i-1];
        mu[i] = h[i] / l[i];
        z[i] = (alpha[i] - h[i-1] * z[i-1]) / l[i];
    }
    l[n-1] = h[n-2] * (2 - mu[n-2]);
    z[n-1] = (alpha[n-1] - h[n-2] * z[n-2]) / l[n-1];
    calculationSteps.push({
        title: "Vectores intermedios l, μ, z:",
        content: `l = [${l.map(li => li.toFixed(4)).join(', ')}]<br>μ = [${mu.map(m => m.toFixed(4)).join(', ')}]<br>z = [${z.map(zi => zi.toFixed(4)).join(', ')}]`
    });
    const c = new Array(n).fill(0);
    const b = new Array(n).fill(0);
    const d = new Array(n).fill(0);
    c[n-1] = z[n-1];
    for (let j = n - 2; j >= 0; j--) {
        c[j] = z[j] - mu[j] * c[j+1];
        b[j] = (y[j+1] - y[j]) / h[j] - h[j] * (c[j+1] + 2 * c[j]) / 3;
        d[j] = (c[j+1] - c[j]) / (3 * h[j]);
    }
    calculationSteps.push({
        title: "Paso 4: Calcular coeficientes b, c, d",
        content: `Coeficientes calculados:<br>b = [${b.map(bi => bi.toFixed(4)).join(', ')}]<br>c = [${c.map(ci => ci.toFixed(4)).join(', ')}]<br>d = [${d.map(di => di.toFixed(4)).join(', ')}]`
    });
    const polynomials = [];
    for (let i = 0; i < n - 1; i++) {
        polynomials.push({
            a: y[i],
            b: b[i],
            c: c[i],
            d: d[i],
            x0: x[i],
            x1: x[i+1]
        });
    }
    calculationSteps.push({
        title: "Paso 5: Construir polinomios por tramo",
        content: `Se han construido ${polynomials.length} polinomios cúbicos.`
    });
    const evalPoints = generateEvalPoints(polynomials, x);
    return {polynomials, evalPoints, calculationSteps};
}

// Generar puntos para la gráfica
function generateEvalPoints(polynomials, x) {
    const evalPoints = [];
    const step = (x[x.length-1] - x[0]) / 200;
    for (let i = 0; i < polynomials.length; i++) {
        const poly = polynomials[i];
        const segmentPoints = [];
        const endX = (i === polynomials.length - 1) ? poly.x1 : poly.x1 - step/2;
        for (let xi = poly.x0; xi <= endX; xi += step) {
            const dx = xi - poly.x0;
            const yi = poly.a + poly.b * dx + poly.c * dx * dx + poly.d * dx * dx * dx;
            segmentPoints.push({x: xi, y: yi});
        }
        if (i === polynomials.length - 1) {
            const dx = poly.x1 - poly.x0;
            const yi = poly.a + poly.b * dx + poly.c * dx * dx + poly.d * dx * dx * dx;
            segmentPoints.push({x: poly.x1, y: yi});
        }
        evalPoints.push(...segmentPoints);
    }
    return evalPoints;
}

// Mostrar resultados
function displayResults(polynomials, x, y, calculationSteps) {
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsSummary = document.getElementById('resultsSummary');
    const polynomialsDiv = document.getElementById('polynomials');
    const calculationStepsDiv = document.getElementById('calculationSteps');
    resultsContainer.style.display = 'block';
    let summaryHtml = `
        <h3>Resumen de la interpolación</h3>
        <p><strong>Tipo de spline:</strong> ${currentSplineType === 'natural' ? 'Natural (S\'\'=0 en extremos)' : 'Completo (con derivadas especificadas)'}</p>
        <p><strong>Número de puntos:</strong> ${x.length}</p>
        <p><strong>Número de polinomios:</strong> ${polynomials.length}</p>
        <p><strong>Rango de interpolación:</strong> [${Math.min(...x).toFixed(3)}, ${Math.max(...x).toFixed(3)}]</p>
    `;
    if (currentSplineType === 'derivative') {
        const fpa = document.getElementById('initialDerivative').value;
        const fpb = document.getElementById('finalDerivative').value;
        summaryHtml += `
            <p><strong>Derivada inicial:</strong> ${parseFloat(fpa).toFixed(3)}</p>
            <p><strong>Derivada final:</strong> ${parseFloat(fpb).toFixed(3)}</p>
        `;
    }
    resultsSummary.innerHTML = summaryHtml;
    let polyHtml = '';
    polynomials.forEach((poly, i) => {
        const terms = [];
        if (Math.abs(poly.a) > 1e-6) {
            terms.push(poly.a.toFixed(6));
        }
        if (Math.abs(poly.b) > 1e-6) {
            const sign = poly.b >= 0 ? '+' : '-';
            terms.push(`${sign} ${Math.abs(poly.b).toFixed(6)}(x-${poly.x0.toFixed(3)}`);
        }
        if (Math.abs(poly.c) > 1e-6) {
            const sign = poly.c >= 0 ? '+' : '-';
            terms.push(`${sign} ${Math.abs(poly.c).toFixed(6)}(x-${poly.x0.toFixed(3)})²`);
        }
        if (Math.abs(poly.d) > 1e-6) {
            const sign = poly.d >= 0 ? '+' : '-';
            terms.push(`${sign} ${Math.abs(poly.d).toFixed(6)}(x-${poly.x0.toFixed(3)})³`);
        }
        const polyStr = terms.length > 0 ? terms.join(' ') : '0';
        polyHtml += `
        <div class="polynomial">
        Tramo ${i+1}: [${poly.x0.toFixed(3)}, ${poly.x1.toFixed(3)}]
        S<sub>${i+1}</sub>(x) = ${polyStr}
        </div>`;
    });
    polynomialsDiv.innerHTML = polyHtml;
    let stepsHtml = '<div class="calculation-steps">';
    calculationSteps.forEach((step, index) => {
        stepsHtml += `
        <div class="step">
            <div class="step-title">Paso ${index + 1}: ${step.title}</div>
            <div>${step.content}</div>
        </div>`;
    });
    stepsHtml += '</div>';
    calculationStepsDiv.innerHTML = stepsHtml;
}

// Dibujar gráfico
function drawChart(x, y, evalPoints) {
    const ctx = document.getElementById('splineChart').getContext('2d');
    if (splineChart) {
        splineChart.destroy();
    }
    splineChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Puntos de interpolación',
                    data: x.map((xi, i) => ({x: xi, y: y[i]})),
                    backgroundColor: '#3a86ff',
                    pointRadius: 8,
                    pointHoverRadius: 10,
                    showLine: false
                },
                {
                    label: 'Trazador cúbico',
                    data: evalPoints.map(p => ({x: p.x, y: p.y})),
                    borderColor: '#8338ec',
                    borderWidth: 3,
                    pointRadius: 0,
                    fill: false,
                    showLine: true,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'x',
                        color: '#b0b0b0',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(200, 200, 200, 0.1)'
                    },
                    ticks: {
                        color: '#b0b0b0'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'f(x)',
                        color: '#b0b0b0',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(200, 200, 200, 0.1)'
                    },
                    ticks: {
                        color: '#b0b0b0'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#e0e0e0',
                        font: {
                            size: 14
                        },
                        padding: 20
                    }
                },
                title: {
                    display: true,
                    text: 'Interpolación por Trazadores Cúbicos',
                    color: '#e0e0e0',
                    font: {
                        size: 18,
                        weight: 'bold'
                    },
                    padding: {
                        top: 10,
                        bottom: 30
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(30, 30, 30, 0.9)',
                    titleColor: '#3a86ff',
                    bodyColor: '#e0e0e0',
                    borderColor: '#3a86ff',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += `(${context.parsed.x.toFixed(3)}, ${context.parsed.y.toFixed(3)})`;
                            return label;
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    updateInputTable();
    document.getElementById('initialDerivative').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            calculateDerivativeSplines();
        }
    });
    document.getElementById('finalDerivative').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            calculateDerivativeSplines();
        }
    });
    document.querySelector('.btn-success').addEventListener('click', function() {
        if (document.getElementById('derivativeInputs').style.display === 'block') {
            calculateDerivativeSplines();
        }
    });
});
