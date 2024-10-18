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
let currentDateIndex = 0;
let availableDates = [];
var devicey ;


$(document).ready(function() {
    $('#search_input').on('input', function() {
        var search_term = $(this).val().trim();
        if (search_term.length === 0) {
            $('#suggestions').empty();
            $('#devices_and_dates').empty();
            $('#individual_dates').empty();
            $('#json_table').empty();
            $('.date-filter').hide();
            in_d_graph1();

            if (window.myChart3) {
                window.myChart3.destroy();
                scrolltoTarget1(); // Destroy myChart3 if it exists
            }
             // Destroy myChart2 if it exists
             if (window.myChart2) {
                window.myChart2.destroy();
            }

            // Destroy myChart1 if it exists
            if (window.myChart1) {
                window.myChart1.destroy();
            }
            if (window.myChart) {
                window.myChart.destroy();
            }
            $('#start_date').val('');
            $('#end_date').val('');
           
           
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
                    showFilterSection();
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
                console.log('Raw Response:', response);
                if (response.summary_data) {
                    try {
                        var summaryData = JSON.parse(response.summary_data);
                        console.log('Parsed Summary Data:', summaryData);
                        availableDates = summaryData.map(item => item.date);
                        console.log('Available Dates:', availableDates);
                        
                        dataCache = summaryData; // Cache the data
                        currentStartIndex = Math.max(0, dataCache.length - daysToShow); // Set the initial start index to show the last 20 days
                        updateChartsWithRange(currentStartIndex);
                        showFilterSection();
                        updateArrowButtons();
                    } catch (e) {
                        console.error('Error parsing JSON:', e);
                    }
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
    
        var last20DaysData = data.slice(-daysToShow);
        var fixedColors = ['rgba(255, 99, 132, 0.7)', 'rgba(255, 159, 64, 0.7)', 'rgba(160, 32, 230, 0.7)', 'rgba(75, 192, 192, 0.7)'];
    
        // Custom date parsing to ensure valid Date objects
        last20DaysData = last20DaysData.map(entry => {
            let dateParts = entry['date'].split('-');
            let parsedDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
            return { ...entry, date: parsedDate };
        }).sort((a, b) => a.date - b.date);
    
        var dates = last20DaysData.map(entry => entry['date'].toISOString().split('T')[0]);
    
        console.log(dates);
    
        var datasets = [];
        var devices = Object.keys(last20DaysData[0]).filter(key => key !== 'date');
    
        devices.forEach((device, index) => {
            var points = last20DaysData.map(entry => {
                var date = entry['date'];
                var value = entry[device];
                if (value !== 0) {
                    return { x: date, y: index };
                } else {
                    return null;
                }
            }).filter(point => point !== null);
    
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
                maintainAspectRatio: false,
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
                                return '';
                            },
                            label: function(context) {
                                var datasetLabel = context.dataset.label || '';
                                var dataPoint = context.dataset.data[context.dataIndex];
                                var value = dataPoint.y;
                                var date = dataPoint.x.toISOString().split('T')[0];
                                return datasetLabel + ': ' + date;
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
                        type: 'time',
                        position: 'bottom',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'dd-MM-yyyy'
                            }
                        },
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
                            display: true
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
                                return devices[value] || '';
                            }
                        }
                    }
                },
                onClick: function(evt, elements) {
                    if (elements.length > 0) {
                        var datasetIndex = elements[0].datasetIndex;
                        var index = elements[0].index;
                        var devicex = datasets[datasetIndex].label;
                        var date = datasets[datasetIndex].data[index].x.toISOString().split('T')[0];
                        devicey = devicex;
                        fetchDataFromSpecificDate(devicex, date);
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
        currentDateIndex = currentStartIndex;
        updateChartsWithRange(currentStartIndex);
        updateArrowButtons();
    });

    $('#left-arrow').on('click', function() {
        currentStartIndex -= step;
        if (currentStartIndex < 0) {
            currentStartIndex = 0;
        }
        currentDateIndex = currentStartIndex;
        updateChartsWithRange(currentStartIndex);
        updateArrowButtons();
    });

    var startDateInput = document.getElementById('start_date');
    var endDateInput = document.getElementById('end_date');
    var startDate, endDate;

    startDateInput.addEventListener('change', function() {
        startDate = this.value;
        fetchDataWithDateRange(); 
    });

    endDateInput.addEventListener('change', function() {
        endDate = this.value;
        fetchDataWithDateRange(); // Pass device parameter
        
        
    });

    function fetchDataWithDateRange() {
        var start_date = $('#start_date').val();
        var end_date = $('#end_date').val();
    
        if (start_date && end_date) {
            $.ajax({
                url: '/fetch_summary_csv',
                type: 'POST',
                data: {
                    unicode: unicode, 
                    device: device,
                    start_date: start_date,
                    end_date: end_date
                },
                success: function(response) {
                    if (response.summary_data) {
                        var summaryData = JSON.parse(response.summary_data);
                        generateGraph(summaryData);
                        // generateBarChart(summaryData); // Update the bar chart
                    } else {
                        console.error('Error:', response.error);
                    }
                },
                error: function(error) {
                    console.error('Error:', error);
                }
            });
        } 
    }


    function updateChartsWithRange(startIndex) {
        let endIndex = startIndex + daysToShow;
        if (endIndex > dataCache.length) {
            endIndex = dataCache.length;
        }
        let dataRange = dataCache.slice(startIndex, endIndex);
        console.log("Data Range:", dataRange);
        generateGraph(dataRange, unicode);
    }
    function updateArrowButtons() {
        $('#left-arrow').prop('disabled', currentStartIndex <= 0);
        $('#right-arrow').prop('disabled', currentStartIndex + daysToShow >= dataCache.length);
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
                      
                        

                    }
                }
            }
        });
    }
    

    // function generateTotalUsageDurationChart(data) {
    //     if (window.myChart2 != undefined && window.myChart2 instanceof Chart) {
    //         window.myChart2.destroy();
    //     }
    //     var canvas = document.getElementById("myChart2");
    //     var context = canvas.getContext('2d');
    //     context.clearRect(0, 0, canvas.width, canvas.height);

    //     var ctx = document.getElementById('myChart2').getContext('2d');
    //     var last20DaysData = data.slice(-daysToShow);
    //     var fixedColors = ['rgba(255, 99, 132, 0.7)', 'rgba(255, 159, 64, 0.7)', 'rgba(160, 32, 230, 0.7)', 'rgba(75, 192, 192, 0.7)'];

    //     var datasets = [{
    //         label: 'Usage Duration',
    //         data: [],
    //         backgroundColor: fixedColors,
    //         borderWidth: 1,
    //         fill: true
    //     }];

        
    //     var dates = last20DaysData.map(entry => entry.date);
    //     console.log(dates);
    //     // Calculate total usage duration for each day
    //     var dailyTotalUsage = Array(daysToShow).fill(0);
    //     last20DaysData.forEach((entry, dayIndex) => {
    //         console.log(last20DaysData[dayIndex])
    //         Object.keys(entry).forEach(device => {
    //             if (device !== 'date') {
    //                 dailyTotalUsage[dayIndex] += entry[device]; // Sum usage duration for all devices
    //                 console.log(dailyTotalUsage[dayIndex]);
    //             }
    //         });
    //     });
    
    //     // Define chart data
    //     var chartData = {
    //         labels: dates,
    //         datasets: [{
    //             label: 'Total Usage Duration (seconds)',
    //             data: dailyTotalUsage,
    //             backgroundColor: 'rgba(75, 192, 192, 0.7)',
    //             borderColor: 'rgba(75, 192, 192, 1)',
    //             borderWidth: 1
    //         }]
    //     };

    

    //     window.myChart2 = new Chart(ctx, {
    //         type: 'bar',
    //         data: chartData,
    //         plugins: [ChartDataLabels],
    //         options: {
    //             barPercentage: 0.91,
    //             scales: {
                    
    //                 y :{
    //                     grace:7,
    //                     // max:999,
    //                     grid: {
    //                         display: false
    //                     },
    //                     border:{
    //                         display: true,
    //                         color:'navy'
    //                     },

    //                     ticks:{ 
    //                         display: true, //this will remove only the label
                        
    //                         font: {
    //                             size: 14,
    //                             weight:'bold',
    //                             color:'purple'
    //                         },
    //                     }
                       
    //                 },
    //                 x: {
                       
    //                     border:{
    //                         display: false,
    //                     },
    //                     ticks: {
    //                         display: false //this will remove only the label
    //                     },
    //                     grid: {
    //                         display: false
    //                     }
    //                 }
    //             },
    //             indexAxis: 'x', // Set orientation to vertical
    //             elements: {
    //                 bar: {
    //                     borderWidth: 6,
    //                 }
    //             },
    //             plugins: {
    //                 title: {
    //                     display: true,
    //                     text: 'Total Usage Duration in Minutes', // Add a title for the chart
    //                     font: {
    //                         size: 18
    //                     }
    //                 },
    //                 datalabels: {
    //                     color: 'black',
    //                     anchor:'end',
    //                     align:'end',
    //                     font:{
    //                         weight:'bold'
    //                     },
    //                     // backgroundColor:'rgb(91, 236, 241)',
    //                     borderRadius:'10',
    //                     borderColor:'rgb(75, 192, 192 )',
    //                     borderWidth:1,
    //                   },
                    
    //                 legend: {
    //                     display: false,
    //                 },
    //                 tooltip: {
    //                      beginAtZero:true,
    //                      callbacks: {
    //                         label: function(context) {
    //                             var label = context.dataset.label || '';
    //                             if (context.parsed.y !== null) {
    //                                 label += ': ' + context.parsed.y;
    //                             }
    //                             return label;
    //                         }
    //                     }
    //                 }
    //             }
    //         }
    //     });
    // }

    function generateTotalUsageDurationChart(data) {
        if (window.myChart2 != undefined && window.myChart2 instanceof Chart) {
            window.myChart2.destroy();
        }
        var canvas = document.getElementById("myChart2");
        var context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
    
        var ctx = document.getElementById('myChart2').getContext('2d');
        var last20DaysData = data.slice(-daysToShow);
    
        // Custom date parsing to ensure valid Date objects
        last20DaysData = last20DaysData.map(entry => {
            console.log("lastdate:", last20DaysData);
            let dateParts = entry['date'].split('-');
            let parsedDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
            return { ...entry, date: parsedDate };
        }).sort((a, b) => a.date - b.date);
    
        // Helper function to format dates for the x-axis
        const formatDate = (date) => {
            let d = new Date(date);
            return d.toISOString().split('T')[0];
        };
    
        // Determine all dates within the range, including any missing dates
        const allDates = [];
        const dateSet = new Set();
    
        // Generate the complete list of dates in the range
        const startDate = new Date(last20DaysData[0].date);
        for (let i = 0; i < daysToShow; i++) {
            let currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            const formattedDate = formatDate(currentDate);
            allDates.push(formattedDate);
            dateSet.add(formattedDate);
        }
    
        // Create datasets with gaps for missing dates
        const dailyTotalUsage = Array(daysToShow).fill(null);
        last20DaysData.forEach(entry => {
            const formattedDate = formatDate(entry.date);
            if (dateSet.has(formattedDate)) {
                const dayIndex = allDates.indexOf(formattedDate);
                let totalUsage = 0;
    
                Object.keys(entry).forEach(device => {
                    if (device !== 'date') {
                        totalUsage += entry[device];
                    }
                });
                dailyTotalUsage[dayIndex] = totalUsage;
            }
        });
    
        // Define chart data
        var chartData = {
            labels: allDates,
            datasets: [{
                label: 'Total Usage Duration (seconds)',
                data: dailyTotalUsage,
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        };
    
        // Generate the chart
        window.myChart2 = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            plugins: [ChartDataLabels],
            options: {
                barPercentage: 0.91,
                scales: {
                    y: {
                        grace: 7,
                        grid: {
                            display: false
                        },
                        border: {
                            display: true,
                            color: 'navy'
                        },
                        ticks: {
                            display: true,
                            font: {
                                size: 14,
                                weight: 'bold',
                                color: 'purple'
                            }
                        }
                    },
                    x: {
                        border: {
                            display: false,
                        },
                        ticks: {
                            display: true,
                            autoSkip: false,
                            maxRotation: 90,
                            minRotation: 45
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                indexAxis: 'x',
                elements: {
                    bar: {
                        borderWidth: 6,
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Total Usage Duration in Minutes',
                        font: {
                            size: 18
                        }
                    },
                    datalabels: {
                        color: 'black',
                        anchor: 'end',
                        align: 'end',
                        font: {
                            weight: 'bold'
                        },
                        borderRadius: '10',
                        borderColor: 'rgb(75, 192, 192)',
                        borderWidth: 1,
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
                in_d_graph1(device, date, data);
                currentDateIndex = availableDates.indexOf(date); // Update currentDateIndex
                updateNavigationButtons(); // Ensure the navigation buttons reflect the current state
            },
            error: function(error) {
                console.error('Error:', error);
            }
        });
    }
    

    function updateNavigationButtons() {
        $('#left').prop('disabled', currentDateIndex <= 0);
        $('#right').prop('disabled', currentDateIndex >= availableDates.length - 1);
    }
    
    $('#left').on('click', function() {
    
        console.log(currentDateIndex);
        if (currentDateIndex > 0) {
            console.log(currentDateIndex);
            currentDateIndex--;
            let date = availableDates[currentDateIndex];
            let device1= devicey;
            console.log(device1);
            fetchDataFromSpecificDate(device1, date);
            updateNavigationButtons();
        }
    });
    
    $('#right').on('click', function() {
        console.log(availableDates.length);
        console.log(availableDates);
        console.log(currentDateIndex);

        if (currentDateIndex < availableDates.length - 1) {
            currentDateIndex++;
            let date = availableDates[currentDateIndex];
            let device1= devicey;
            console.log(device1);
            fetchDataFromSpecificDate(device1, date);
            updateNavigationButtons();
        }
    });
    

    
    function scrolltoTarget1(){
        const target= document.getElementById('date-filter');
        target.scrollIntoView({behavior:'smooth'});
    }
    

    function showFilterSection() {
        $('.date-filter').show();
    }
    function showFilterSection1() {
        $('.box').show();
    }
    
    function in_d_graph1(device, date, data) {
        // Get the search input element
        const searchInput = document.getElementById('search_input');
    
        // Check if the search input is empty
        if (!searchInput.value.trim()) {
            // If the search input is empty, clear the session charts container and return
            const sessionChartsContainer = document.getElementById('session-charts-container');
            sessionChartsContainer.innerHTML = '';
            return;
        }
        if (searchInput === unicode) {
            // If the search input is empty, clear the session charts container and return
            const sessionChartsContainer = document.getElementById('session-charts-container');
            sessionChartsContainer.innerHTML = '';
            return;
        }
    
        console.log('Received data:', data);
    
        // Group data by session number
        const sessions = data.reduce((acc, entry) => {
            if (entry.GameName.toLowerCase() === 'calibration') {
                return acc; // Skip calibration entries
            }
    
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
    
            if (sessionData.length === 0) {
                return; // Skip sessions with no data (e.g., only calibration entries)
            }
    
            var canvas = document.createElement('canvas');
            canvas.id = 'session_chart_' + index;
            console.log(canvas.id);
            sessionChartsContainer.appendChild(canvas);
    
            var ctx = canvas.getContext('2d');
    
            var dates = sessionData.map(entry => entry.GameName);
            var minutes = sessionData.map(entry => entry.GameDuration);
    
            var fixedColors = [
                'rgba(255, 99, 132, 0.7)',  // Light pinkish-red
                'rgba(255, 159, 64, 0.7)',  // Warm orange
                'rgba(75, 192, 192, 0.7)',  // Soft teal
                'rgba(54, 162, 235, 0.7)',  // Sky blue
                'rgba(153, 102, 255, 0.7)', // Lavender
                'rgba(255, 205, 86, 0.7)',  // Warm yellow
                'rgba(255, 99, 71, 0.7)'    // Tomato red
            ];
    
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

