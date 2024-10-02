var unicode; // Declare unicode variable globally
var device; // Declare device variable globally

// Number of days to show in the graph
const daysToShow = 20;
// Number of days to step when clicking the arrow
const step = 5;
// Current start index for the data range
let currentStartIndex = 0;
// Cache data to avoid re-fetching
let dataCache = [];

$(document).ready(function() {
    $('#search_input').on('input', function() {
        var search_term = $(this).val().trim();
        if (search_term.length === 0) {
            $('#suggestions').empty();
            $('#devices_and_dates').empty();
            $('#individual_dates').empty();
            $('#json_table').empty();
            if (window.myChart3) {
                window.myChart3.destroy();
                scrolltoTarget1(); // Destroy myChart3 if it exists
            }
            return;
        }

        $.ajax({
            url: '/get_suggestions',
            type: 'POST',
            data: { search_term: search_term },
            success: function(response) {
                $('#suggestions').empty();
                response.suggestions.forEach(function(suggestion) {
                    var suggestionElement = $('<div>').text(suggestion.UniCode + ' - ' + suggestion.Name);
                    suggestionElement.on('click', function() {
                        fetchDevicesAndDates(suggestion.UniCode);
                    });
                    $('#suggestions').append(suggestionElement);
                });
            },
            error: function(error) {
                console.error('Error:', error);
            }
        });
    });

    function fetchDevicesAndDates(uniCode) {
        unicode = uniCode; // Set the global unicode variable
        $.ajax({
            url: '/get_json_data',
            type: 'POST',
            data: { unicode: unicode },
            success: function(response) {
                console.log(response.json_data); // Log JSON data received from the server
                if (response.json_data) {
                    displayJsonData(response.json_data);
                    fetchSummaryCSV(uniCode);
                } else {
                    console.error('JSON data not found');
                }
            },
            error: function(error) {
                console.error('Error:', error);
            }
        });

        // Set the value of the search input to the selected Unicode
        $('#search_input').val(unicode);

        // Clear the suggestions
        $('#suggestions').empty();

        // Clear the selected class
        $('.selected').removeClass('selected');
    }

    function displayJsonData(jsonData) {
        $('#json_table').empty(); // Clear previous table content
        var table = $('<table>').addClass('json-table');

        // Create table headers
        var headerRow = $('<tr>');
        for (var key in jsonData[0]) {
            headerRow.append($('<th>').text(key));
        }
        table.append(headerRow);

        // Create table rows with data
        var row = $('<tr>');
        for (var key in jsonData[0]) {
            row.append($('<td>').text(jsonData[0][key]));
        }
        table.append(row);

        $('#json_table').append(table);
        $('#json_table').show(); // Show the table
    }

    function fetchSummaryCSV(startDate = null, endDate = null) {
        var requestData = { unicode: unicode };
        console.log(requestData);
        if (startDate && endDate) {
            requestData.start_date = startDate;
            requestData.end_date = endDate;
        }
        $.ajax({
            url: '/fetch_summary_csv',
            type: 'POST',
            data: requestData,
            success: function(response) {
                if (response.summary_data) {
                    var summaryData = JSON.parse(response.summary_data);
                    console.log(summaryData);
                    dataCache = summaryData; // Cache the data
                    currentStartIndex = Math.max(0, dataCache.length - daysToShow); // Set the initial start index to show the last 20 days
                    updateChartsWithRange(currentStartIndex);
                    showFilterSection();
                } else {
                    console.error('Error:', response.error);
                }
            },
            error: function(error) {
                console.error('Error:', error);
            }
        });
    }

    function updateChartType(newType) {
        if (window.myChart) {
            window.myChart.config.type = newType;
            window.myChart.update();
        }
    }

    $('#chart-type').change(function() {
        var selectedType = $(this).val();
        if (selectedType !== chartType) {
            chartType = selectedType;
            updateChartType(chartType);
        }
    });

    function generateGraph(data, unicode) {
        if (window.myChart != undefined && window.myChart instanceof Chart) {
            window.myChart.destroy();
        }

        var canvas = document.getElementById("myChart");
        var context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);

        var ctx = document.getElementById('myChart').getContext('2d');

        var last20DaysData = data.slice(-daysToShow); // Changed to slice the last 20 data points
        var fixedColors = ['rgba(255, 99, 132, 0.7)', 'rgba(255, 159, 64, 0.7)', 'rgba(160, 32, 230, 0.7)', 'rgba(75, 192, 192, 0.7)'];

        var dates = last20DaysData.map(entry => entry['date']);
        console.log(dates);

        var datasets = [];

        var devices = Object.keys(last20DaysData[0]).filter(key => key !== 'date');

        devices.forEach((device, index) => {
            var points = last20DaysData.map(entry => {
                var date = entry['date']; // Date is not converted to a JavaScript Date object
                var value = entry[device];
                // Only plot points if the value is not 0
                if (value !== 0) {
                    return { x: date, y: index }; // Using index as y value for device names
                } else {
                    return null; // Return null for values 0 to skip plotting
                }
            }).filter(point => point !== null); // Remove null values

            datasets.push({
                label: device,
                data: points,
                backgroundColor: fixedColors[index % fixedColors.length],
                pointRadius: 7.5,
                pointHoverRadius: 7,
                borderWidth: 1,
                showLine: false
            });
        });

        window.myChart = new Chart(ctx, {
            type: 'bubble',
            data: {
                datasets: datasets
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'Device Usage',
                        position: 'bottom',
                        font: {
                            size: 18,
                        }
                    },
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            title: function(tooltipItem, data) {
                                return ''; // Empty string to hide x-axis label
                            },
                            label: function(context) {
                                var datasetLabel = context.dataset.label || '';
                                var dataPoint = context.dataset.data[context.dataIndex];
                                var value = dataPoint.y;
                                var date = dataPoint.x;
                                return datasetLabel + ': ' + date + '';
                            }
                        }
                    }
                },
                elements: {
                    point: {
                        pointStyle: ''
                    }
                },
                scales: {
                    x: {
                        type: 'category', // Use category scale to display dates as they are
                        position: 'bottom',
                        grid: {
                            display: true,
                            lineWidth: 2
                        },
                        ticks: {
                            beginAtZero: false
                        },
                        border: {
                            color: 'navy',
                            width: 2
                        },
                    },
                    y: {
                        borderWidth: 1,
                        min: -0.3,
                        max: devices.length - 0.6,
                        border: {
                            color: 'navy',
                            width: 3,
                            display: false
                        },
                        grid: {
                            display: false,
                        },
                        reverse: true,
                        ticks: {
                            font: {
                                size: 16,
                                weight: "bold"
                            },
                            callback: function(value, index, values) {
                                return devices[value] || ''; // Display device names instead of numbers
                            }
                        }
                    }
                },
                onClick: function(evt, elements) {
                    if (elements.length > 0) {
                        var datasetIndex = elements[0].datasetIndex;
                        var index = elements[0].index;
                        var device = datasets[datasetIndex].label;
                        var date = datasets[datasetIndex].data[index].x;

                        // Call function to fetch details from folder using device name and date
                        fetchDataFromSpecificDate(device, date);
                        scrolltoTarget2();
                    }
                }
            }
        });

        function scrolltoTarget2() {
            const target = document.getElementById('dates');
            target.scrollIntoView({ behavior: 'smooth' });
        }

        generateBarChart(last20DaysData, devices);
        generateTotalUsageDurationChart(data);
    }

    $('#right-arrow').on('click', function() {
        currentStartIndex += step;
        if (currentStartIndex + daysToShow > dataCache.length) {
            currentStartIndex = dataCache.length - daysToShow;
        }
        updateChartsWithRange(currentStartIndex);
    });

    $('#left-arrow').on('click', function() {
        currentStartIndex -= step;
        if (currentStartIndex < 0) {
            currentStartIndex = 0;
        }
        updateChartsWithRange(currentStartIndex);
    });

    function updateChartsWithRange(startIndex) {
        let endIndex = startIndex + daysToShow;
        if (endIndex > dataCache.length) {
            endIndex = dataCache.length;
        }
        let dataRange = dataCache.slice(startIndex, endIndex);
        console.log("Data Range:", dataRange);
        generateGraph(dataRange, unicode);
    }



    function generateBarChart(data, labels) {
        if (window.myChart1 != undefined && window.myChart1 instanceof Chart) {
            window.myChart1.destroy();
        }
        var canvas = document.getElementById("myChart1");
        var context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);

        var ctx = document.getElementById('myChart1').getContext('2d');
        var last20DaysData = data.slice(-daysToShow);
        var fixedColors = ['rgba(255, 99, 132, 0.7)', 'rgba(255, 159, 64, 0.7)', 'rgba(160, 32, 230, 0.7)', 'rgba(75, 192, 192, 0.7)'];

        var deviceUsageCounts = labels.map(device => {
            var totalDays = 0;
            last20DaysData.forEach(entry => {
                if (entry[device] !== 0) {
                    totalDays++;
                }
            });
            return totalDays;
        });

        var datasets = [{
            label: 'Usage Count',
            data: deviceUsageCounts,
            backgroundColor: fixedColors,
            borderWidth: 1,
            fill: false
        }];

        window.myChart1 = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            plugins: [ChartDataLabels],
            options: {
                barPercentage:1.1,
                ticks:{
                    color: 'white'

                },
                
                scales: {
                    y :{min:-0.6,
                        display: false,
                        grid: {
                            display: false
                        },
                        ticks: {
                            display: false //this will remove only the label
                        }
                    },
                    x: {
                        grace:3,
                        grid: {
                            display: false
                        }
                    }
                },
                
                indexAxis: 'y',
                elements: {
                    bar: {
                        borderWidth: 1,
                    }
                },
                plugins:
                {
                    title: {
                        display: true,
                        text: 'Total Days Usage Duration',
                        position:'bottom', // Add a title for the chart
                        font: {
                            size: 18
                        }
                    },
                    datalabels:{
                        color:'black',
                        font:{
                            weight:'bold',
                            size:16,
                        },
                        anchor: 'end',
                        align:'end',
                        borderRadius:4,
                        borderWidth:1,
                        borderColor:'rgb(75, 192, 192)',
                        backgroundColor:'rgb(91, 236, 241)'
    
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {beginAtZero:true,
                        callbacks: {
                            label: function(context) {
                                var label = context.dataset.label || '';
                                if (context.parsed.y !== null) {
                                    label += ': ' + context.parsed.x;
                                }
                                return label;
                            }
                        }
                    }
                },
                onClick: function(evt, elements) {
                    if (elements.length > 0) {
                        var datasetIndex = elements[0].datasetIndex;
                        var index = elements[0].index;
                        var device = window.myChart1.data.labels[index];
                        console.log(device);
                        fetchDataForDevice(device);
                        scrolltoTarget();
                        

                    }
                }
            }
        });
    }
    function fetchDataForDevice(device, startDate = null, endDate = null) {
        console.log('Fetching data for device:', device);
    
        var requestData = { unicode: unicode, device: device };
    
        if (startDate && endDate) {
            requestData.start_date = startDate;
            requestData.end_date = endDate;
        }
    
        // Example AJAX request:
        $.ajax({
            url: '/fetch_data_for_device',
            type: 'POST',
            data: requestData,
            success: function(response) {
                if (response.device_data) {
                    var deviceData = JSON.parse(response.device_data);
                    console.log(deviceData);
                    // showFilterSection1(); 
                    updateChart2WithData(device,deviceData, startDate, endDate); // Pass startDate and endDate
                } else {
                    console.error('Error:', response.error);
                }
            },
            error: function(error) {
                console.error('Error:', error);
            }
        });
    }

    function generateTotalUsageDurationChart(data) {
        if (window.myChart2 != undefined && window.myChart2 instanceof Chart) {
            window.myChart2.destroy();
        }
        var canvas = document.getElementById("myChart2");
        var context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);

        var ctx = document.getElementById('myChart2').getContext('2d');
        var last20DaysData = data.slice(-daysToShow);
        var fixedColors = ['rgba(255, 99, 132, 0.7)', 'rgba(255, 159, 64, 0.7)', 'rgba(160, 32, 230, 0.7)', 'rgba(75, 192, 192, 0.7)'];

        var datasets = [{
            label: 'Usage Duration',
            data: [],
            backgroundColor: fixedColors,
            borderWidth: 1,
            fill: true
        }];

        
        var dates = last20DaysData.map(entry => entry.date);
    
        // Calculate total usage duration for each day
        var dailyTotalUsage = Array(daysToShow).fill(0);
        last20DaysData.forEach((entry, dayIndex) => {
            Object.keys(entry).forEach(device => {
                if (device !== 'date') {
                    dailyTotalUsage[dayIndex] += entry[device]; // Sum usage duration for all devices
                }
            });
        });
    
        // Define chart data
        var chartData = {
            labels: dates,
            datasets: [{
                label: 'Total Usage Duration (seconds)',
                data: dailyTotalUsage,
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        };

    

        window.myChart2 = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            plugins: [ChartDataLabels],
            options: {
                barPercentage: 0.91,
                scales: {
                    
                    y :{
                        grace:7,
                        max:999,
                        grid: {
                            display: false
                        },
                        border:{
                            display: true,
                            color:'navy'
                        },

                        ticks:{ 
                            display: true, //this will remove only the label
                        
                            font: {
                                size: 14,
                                weight:'bold',
                                color:'purple'
                            },
                        }
                       
                    },
                    x: {
                       
                        border:{
                            display: false,
                        },
                        ticks: {
                            display: false //this will remove only the label
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                indexAxis: 'x', // Set orientation to vertical
                elements: {
                    bar: {
                        borderWidth: 6,
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Total Usage Duration in Minutes', // Add a title for the chart
                        font: {
                            size: 18
                        }
                    },
                    datalabels: {
                        color: 'black',
                        anchor:'end',
                        align:'end',
                        font:{
                            weight:'bold'
                        },
                        // backgroundColor:'rgb(91, 236, 241)',
                        borderRadius:'10',
                        borderColor:'rgb(75, 192, 192 )',
                        borderWidth:1,
                      },
                    
                    legend: {
                        display: false,
                    },
                    tooltip: {
                         beginAtZero:true,
                         callbacks: {
                            label: function(context) {
                                var label = context.dataset.label || '';
                                if (context.parsed.y !== null) {
                                    label += ': ' + context.parsed.y;
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    function fetchDataFromSpecificDate(device, date) {
        var requestData = { unicode: unicode, device: device, date: date };
        console.log(requestData);
    
        $.ajax({
            url: '/fetch_data_from_date_folder',
            type: 'POST',
            data: requestData,
            success: function(response) {
                console.log(response);    
                var data = response.data;
                // showFilterSection2();  // Assuming response contains data
                in_d_graph1(device,date,data);
            },
            error: function(error) {
                console.error('Error:', error);
            }
        });
    }


    function scrolltoTarget(){
        const target= document.getElementById('c7');
        target.scrollIntoView({behavior:'smooth'});
    }
    function scrolltoTarget1(){
        const target= document.getElementById('date-filter');
        target.scrollIntoView({behavior:'smooth'});
    }
    

    function showFilterSection() {
        $('.date-filter').show();
    }
    // function showFilterSection1() {
    //     $('.cnn3').show();
    // }
    function updateChart2WithData(device, data, startDate, endDate) {
        // Here you can update or generate the chart in #myChart2
        console.log(startDate, endDate);
        console.log('Updating myChart2 with data:', data);
    
        if (window.myChart3 != undefined && window.myChart3 instanceof Chart) {
            window.myChart3.destroy();
        }
    
        var deviceN = device;
        console.log(deviceN);
    
        var fixedColors = ['rgba(255, 99, 132, 0.7)', 'rgba(255, 159, 64, 0.7)', 'rgba(160, 32, 240, 0.7)', 'rgba(75, 192, 192, 0.7)'];
        var fc = 'rgb(124, 223, 190)';
        var ctx = document.getElementById('myChart3').getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, fc); // Start color
        gradient.addColorStop(1, 'rgba(100, 100, 0, 0.2)'); // End color (transparent)
        var last30DaysData = data;
    
        var dates = last30DaysData.map(entry => entry.Date); // Extract dates
    
        // Calculate total usage duration for each day
        var Hours = last30DaysData.map(entry => entry.minutes);
    
        window.myChart3 = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Total Usage Duration',
                    data: Hours,
                    backgroundColor: gradient,
                    borderWidth: 1,
                    fill: true,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.3
                }]
            },
            options: {
                indexAxis: 'x', // Set orientation to vertical
                elements: {
                    line: {
                        borderWidth: 2,
                    }
                },
                scales: {
                    y: {
                        min: 0,
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: deviceN + ' - Total Minutes', // Add a title for the chart
                        font: {
                            size: 18
                        }
                    },
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        beginAtZero: true,
                        callbacks: {
                            label: function(context) {
                                var label = context.dataset.label || '';
                                if (context.parsed.y !== null) {
                                    label += ': ' + context.parsed.y;
                                }
                                return label;
                            }
                        }
                    }
                },
                animation: {
                    duration: 2000, // Animation duration in milliseconds
                    easing: 'easeOutElastic', // Easing function
        
                }
            }
        });
    }
    
    
    function in_d_graph1(device, date, data) {
        console.log('Received data:', data);
    
        // Group data by session number
        const sessions = data.reduce((acc, entry) => {
            const sessionNumber = entry.SessionNumber;
            if (!acc[sessionNumber]) {
                acc[sessionNumber] = [];
            }
            acc[sessionNumber].push(entry);
            return acc;
        }, {});
    
        const sessionChartsContainer = document.getElementById('session-charts-container');
        sessionChartsContainer.innerHTML = '';  // Clear previous charts
    
        Object.keys(sessions).forEach((sessionNumber, index) => {
            const sessionData = sessions[sessionNumber];
            console.log('Session data:', sessionData);
    
            var canvas = document.createElement('canvas');
            canvas.id = 'session-chart-' + index;
            sessionChartsContainer.appendChild(canvas);
    
            var ctx = canvas.getContext('2d');
    
            var dates = sessionData.map(entry => entry.GameName);
            var minutes = sessionData.map(entry => entry.GameDuration);
            var fixedColors = ['rgba(255, 99, 132, 0.7)', 'rgba(255, 129, 64, 0.7)', 'rgba(160, 32, 130, 0.7)', 'rgba(75, 92, 102, 0.7)', 'rgba(255, 19, 64, 0.7)', 'rgba(160, 32, 230, 0.7)', 'rgba(75, 12, 192, 0.7)'];
    
            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Total Usage Duration',
                        data: minutes,
                        backgroundColor: fixedColors,
                        borderWidth: 1,
                        fill: true,
                        borderColor: 'rgba(0, 0, 0, 0.1)',
                    }]
                },
                plugins: [ChartDataLabels],
                options: {
                    animation: {
                        duration: 900,
                        easing: 'linear',
                        loop: false,
                    },
                    elements: {
                        bar: {
                            borderWidth: 2,
                        }
                    },
                    scales: {
                        y: {
                            ticks: {
                                display: false,
                            },
                            min: 0,
                            grid: {
                                display: false
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: `${device} / ${date} / Session ${sessionNumber} Total Minutes`,
                            font: {
                                size: 18  // Adjust the font size as needed
                            }
                        },
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                                font: {
                                    size: 14  // Adjust the font size as needed
                                }
                            }
                        },
                        datalabels: {
                            color: 'white',
                            anchor: 'center',
                            align: 'center',
                            font: {
                                weight: 'bold',
                                size: 15,  // Adjust the font size as needed
                            },
                            backgroundColor: 'black',
                            borderRadius: 10,
                            borderColor: 'rgb(75, 192, 192)',
                            borderWidth: 1,
                        }
                    }
                }
            });
        });
    }
    
});

