
let unicode;
let device;

const daysToShow = 20;
const step = 5;
let currentStartIndex = 0;
let dataCache = [];
let currentDateIndex = 0;
let availableDates = [];

$(document).ready(function() {
    $('#search_input').on('input', function() {
        var search_term = $(this).val().trim();
        if (search_term.length === 0) {
            $('#suggestions').empty();
            $('#devices_and_dates').empty();
            $('#individual_dates').empty();
            $('#json_table').empty();
            $('.box').hide();
            if (window.myChart3) {
                window.myChart3.destroy();
                scrolltoTarget1(); 
            }
            if (window.myChart2) {
                window.myChart2.destroy();
            }
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
                    availableDates = response.json_data.map(item => item.date);
                    currentDateIndex = 0; // Reset current date index
                    displayJsonData(response.json_data);
                    fetchSummaryCSV(uniCode);
                    showFilterSection1();
                } else {
                    console.error('JSON data not found');
                }
            },
            error: function(error) {
                console.error('Error:', error);
            }
        });

        $('#search_input').val(unicode);
        $('#suggestions').empty();
        $('.selected').removeClass('selected');
    }

    function displayJsonData(jsonData) {
        $('#json_table').empty(); 
        var table = $('<table>').addClass('json-table');
        var headerRow = $('<tr>');
        for (var key in jsonData[0]) {
            headerRow.append($('<th>').text(key));
        }
        table.append(headerRow);
        var row = $('<tr>');
        for (var key in jsonData[0]) {
            row.append($('<td>').text(jsonData[0][key]));
        }
        table.append(row);
        $('#json_table').append(table);
        $('#json_table').show(); 
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
                    dataCache = summaryData; 
                    currentStartIndex = Math.max(0, dataCache.length - daysToShow); 
                    updateChartsWithRange(currentStartIndex);
                    showFilterSection();
                    updateArrowButtons();
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
        var labels = data.map(function(entry) { return entry.Date; });
        var values = data.map(function(entry) { return entry.Count; });
        window.myChart = new Chart(ctx, {
            type: chartType, 
            data: {
                labels: labels,
                datasets: [{
                    label: 'Count of GamePlayed',
                    data: values,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)', 
                    borderColor: 'rgba(75, 192, 192, 1)', 
                    borderWidth: 1 
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        canvas.onclick = function(evt) {
            var activePoints = window.myChart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, false);
            if (activePoints.length > 0) {
                var clickedIndex = activePoints[0].index;
                var clickedLabel = window.myChart.data.labels[clickedIndex];
                device = 'YourDevice';
                console.log('Clicked Date:', clickedLabel);
                fetchDataFromSpecificDate(device, clickedLabel);
            }
        }
    }

    $('#search_button').on('click', function() {
        var unicode = $('#search_input').val().trim();
        fetchDevicesAndDates(unicode);
    });

    function showFilterSection() {
        $('#filter_section').show();
    }

    function showFilterSection1() {
        $('#filter_section1').show();
    }

    function updateChartsWithRange(startIndex) {
        var endIndex = Math.min(startIndex + daysToShow, dataCache.length);
        var rangeData = dataCache.slice(startIndex, endIndex);
        generateGraph(rangeData);
        updateArrowButtons(); 
    }

    function updateArrowButtons() {
        $('#left-arrow').prop('disabled', currentStartIndex === 0);
        $('#right-arrow').prop('disabled', currentStartIndex + daysToShow >= dataCache.length);
    }

    $('#left-arrow').on('click', function() {
        if (currentStartIndex > 0) {
            currentStartIndex = Math.max(0, currentStartIndex - step);
            updateChartsWithRange(currentStartIndex);
        }
    });

    $('#right-arrow').on('click', function() {
        if (currentStartIndex + daysToShow < dataCache.length) {
            currentStartIndex = Math.min(dataCache.length - daysToShow, currentStartIndex + step);
            updateChartsWithRange(currentStartIndex);
        }
    });

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
                updateNavigationButtons();
            },
            error: function(error) {
                console.error('Error:', error);
            }
        });
    }

    function updateNavigationButtons() {
        $('#left-button').prop('disabled', currentDateIndex <= 0);
        $('#right-button').prop('disabled', currentDateIndex >= availableDates.length - 1);
    }

    $('#left-button').on('click', function() {
        if (currentDateIndex > 0) {
            currentDateIndex--;
            let date = availableDates[currentDateIndex];
            fetchDataFromSpecificDate(device, date);
        }
    });

    $('#right-button').on('click', function() {
        if (currentDateIndex < availableDates.length - 1) {
            currentDateIndex++;
            let date = availableDates[currentDateIndex];
            fetchDataFromSpecificDate(device, date);
        }
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
                        availableDates = summaryData.map(item => item.date);
                        currentDateIndex = 0; // Reset current date index
                        generateGraph(summaryData);
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

    $('#filter_button').on('click', fetchDataWithDateRange);
});

