# 🚰 Herramienta para el Cálculo de Diámetros de Cañerías de Gas - Método Equivalente 🛠️

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

## Descripción del Proyecto

Esta es una aplicación web interactiva diseñada para ingenieros, técnicos y estudiantes del sector del gas, que permite calcular los diámetros de cañerías utilizando el método de longitud equivalente. La herramienta simplifica un proceso de cálculo complejo al permitir al usuario ingresar datos por tramo, como longitud real y consumo, y luego agregar accesorios (codos, válvulas, etc.) para determinar el diámetro final requerido.

## Características Principales

* ✔️ **Cálculo por Tramo**: Permite la entrada de múltiples tramos con sus respectivas longitudes y consumos acumulados.
* ⚙️ **Predimensionamiento Automático**: La aplicación sugiere un diámetro inicial basado en la longitud real y el consumo de cada tramo.
* 📏 **Método de Longitud Equivalente**: Calcula la longitud total de cada tramo sumando la longitud real y la longitud equivalente de los accesorios.
* 🖥️ **Interfaz Interactiva de Accesorios**: El usuario puede seleccionar visualmente los accesorios de la instalación y especificar su diámetro para calcular su longitud equivalente.
* 📊 **Resultados Detallados**: Muestra un resumen completo de los cálculos, incluyendo la longitud equivalente total, la longitud total del tramo y el diámetro final recomendado.
* 🗂️ **Gestión de Datos**:
    * 🔄 **Reiniciar Cálculo**: Opción para borrar todos los datos y comenzar de nuevo.
    * 📥 **Descargar Reportes**: Genera y descarga un informe en formato PDF o CSV con el detalle de los cálculos.
    * 📋 **Copiar al Portapapeles**: Permite copiar los resultados de los cálculos con formato de texto para pegarlos en otros documentos.
* 📱 **Diseño Responsivo**: Adaptado para su uso en dispositivos móviles y de escritorio.

## Tecnologías Utilizadas

* **HTML5**: Estructura de la aplicación.
* **CSS3**: Estilos y diseño, incluyendo un encabezado fijo y un diseño de cuadrícula para los accesorios.
* **JavaScript (ES6+)**: Lógica de la aplicación, manejo de eventos, cálculos y manipulación del DOM.
* **Bibliotecas Externas**:
    * **jsPDF**: Para la generación de los reportes en formato PDF.
    * **jspdf-autotable**: Un plugin para jsPDF que facilita la creación de tablas en los documentos PDF.

## Estructura de Archivos

```bash
/
├── index.html           # Archivo principal de la aplicación.
├── styles.css           # Hoja de estilos para la interfaz de usuario.
├── script.js            # Lógica principal de la aplicación, cálculos y manejo de eventos.
├── data/
│   └── convertcsv.json  # Archivo JSON con los datos de referencia para los cálculos de la tabla.
└── img/
    ├── logo_gas_color.png
    ├── codo45.png
    ├── codo90.png
    ├── curva.png
    ├── reduccion.png
    ├── te_flujo.png
    ├── te90.png
    ├── valvula_esclusa.png
    ├── valvula_globo.png
    └── valvula_macho.png # Imágenes de los accesorios.

## Modo de Uso

1.  **Ingresar Tramo**: En la sección "Datos del Tramo", complete el nombre, la longitud real y el consumo de Kcal/h. Puede agregar varios consumos por tramo.
2.  **Agregar Tramo**: Haga clic en "Agregar Tramo" para guardar la información y pasar al siguiente.
3.  **Finalizar y Calcular**: Una vez que haya ingresado todos los tramos, haga clic en "Finalizar Tramos y Calcular".
4.  **Seleccionar Accesorios**: Para cada tramo, seleccione los accesorios correspondientes. La aplicación le pedirá que ingrese el diámetro del accesorio para calcular su longitud equivalente.
5.  **Revisar Resultados**: Al finalizar, el sistema mostrará un resumen detallado con la longitud total de cada tramo y el diámetro de cañería final recomendado.
6.  **Exportar Resultados**: Utilice los botones "Descargar Datos" o "Copiar al Portapapeles" para guardar o compartir la información.


## Contacto

Desarrollado por [Julio "Lito" Acuña](mailto:lititosalta@gmail.com)