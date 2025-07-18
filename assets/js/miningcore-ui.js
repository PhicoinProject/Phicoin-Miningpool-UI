// config
var API = 'https://apool.lol/api/'; // API address
var defaultPool = ''; // Default Pool ID

var currentPool = defaultPool;

// private function
function _formatter(value, decimal, unit) {
    if (value === 0) {
        return '0 ' + unit;
    } else {
        var si = [
            { value: 1, symbol: "" },
            { value: 1e3, symbol: "k" },
            { value: 1e6, symbol: "M" },
            { value: 1e9, symbol: "G" },
            { value: 1e12, symbol: "T" },
            { value: 1e15, symbol: "P" },
            { value: 1e18, symbol: "E" },
            { value: 1e21, symbol: "Z" },
            { value: 1e24, symbol: "Y" },
        ];
        for (var i = si.length - 1; i > 0; i--) {
            if (value >= si[i].value) {
                break;
            }
        }
        return (value / si[i].value).toFixed(decimal).replace(/\.0+$|(\.[0-9]*[1-9])0+$/, "$1") + ' ' + si[i].symbol + unit;
    }
}

function loadPools(renderCallback) {
    $('#currentPool b').remove();
    $('#currentPool ul').remove();
    return $.ajax(API + 'pools')
        .done(function (data) {
            var poolList = '<ul class="dropdown-menu">';
            if (data.pools.length > 1) {
                $('#currentPool').attr('data-toggle', 'dropdown');
                $('#currentPool').append('<b class="caret"></b>');
            }
            $.each(data.pools, function (index, value) {
                if (currentPool.length === 0 && index === 0) {
                    currentPool = value.id;
                }
                var pool_name='';
                if (value.id == 'phi1') {
                    pool_name = 'PPLNS';
                } else if (value.id == 'phi2') {
                    pool_name = 'SOLO';
                }else{
                    pool_name = value.id;
                }
                if (currentPool === value.id) {
                    $('#currentPool p').attr('data-id', value.id);
                    $('#currentPool p').text(pool_name);
                } else {
                    poolList += '<li><a href="javascript:void(0)" data-id="' + value.id + '">' + pool_name + '</a></li>';
                }
            });
            poolList += '</ul>';
            if (poolList.length > 0) {
                $('#poolList').append(poolList);
            }
            if (data.pools.length > 1) {
                $('#poolList li a').on('click', function (event) {
                    currentPool = $(event.target).attr('data-id');
                    loadPools(renderCallback);
                });
            }
            if (renderCallback.has()) {
                renderCallback.fire();
            }
        })
        .fail(function () {
            $.notify({
                icon: "ti-cloud-down",
                message: "Error: No response from API.<br>(loadPools)",
            }, {
                type: 'danger',
                timer: 3000,
            });
        });
}

function loadStatsData() {
    return $.ajax(API + 'pools')
        .done(function (data) {
            $.each(data.pools, function (index, value) {
                if (currentPool === value.id) {
                    //$('#poolShares').text(_formatter(value, 0, ''));
                    //$('#poolBlocks').text(_formatter(value, 0, ''));
                    $('#poolMiners').text(_formatter(value.poolStats.connectedMiners, 0, ''));
                    $('#poolHashRate').text(_formatter(value.poolStats.poolHashrate, 5, 'H/s'));
                    $('#networkHashRate').text(_formatter(value.networkStats.networkHashrate, 5, 'H/s'));
                    $('#networkDifficulty').text(_formatter(value.networkStats.networkDifficulty, 5, ''));
                }
            });
        })
        .fail(function () {
            $.notify({
                icon: "ti-cloud-down",
                message: "Error: No response from API.<br>(loadStatsData)",
            }, {
                type: 'danger',
                timer: 3000,
            });
        });
}

function loadStatsChart() {
    return $.ajax(API + 'pools/' + currentPool + '/performance')
        .done(function (data) {
            labels = [];
            connectedMiners = [];
            networkHashRate = [];
            poolHashRate = [];
            $.each(data.stats, function (index, value) {
                if (labels.length === 0 || (labels.length + 1) % 4 === 1) {
                    labels.push(new Date(value.created).toISOString().slice(11, 16));
                } else {
                    labels.push('');
                }
                networkHashRate.push(value.networkHashrate);
                poolHashRate.push(value.poolHashrate);
                connectedMiners.push(value.connectedMiners);
            });
            var data = {
                labels: labels,
                series: [
                    networkHashRate,
                    poolHashRate,
                ],
            };
            var options = {
                showArea: true,
                height: "245px",
                axisX: {
                    showGrid: false,
                },
                axisY: {
                    offset: 47,
                    labelInterpolationFnc: function(value) {
                        return _formatter(value, 1, '');
                    }
                },
                lineSmooth: Chartist.Interpolation.simple({
                    divisor: 2,
                }),
            };
            var responsiveOptions = [
                ['screen and (max-width: 640px)', {
                    axisX: {
                        labelInterpolationFnc: function (value) {
                            return value[0];
                        }
                    },
                }],
            ];
            Chartist.Line('#chartStatsHashRate', data, options, responsiveOptions);
            var data = {
                labels: labels,
                series: [
                    connectedMiners,
                ],
            };
            var options = {
                height: "245px",
                axisX: {
                    showGrid: false,
                },
                lineSmooth: Chartist.Interpolation.simple({
                    divisor: 2,
                }),
            };
            var responsiveOptions = [
                ['screen and (max-width: 640px)', {
                    axisX: {
                        labelInterpolationFnc: function (value) {
                            return value[0];
                        }
                    },
                }],
            ];
            Chartist.Line('#chartStatsMiners', data, options, responsiveOptions);
        })
        .fail(function () {
            $.notify({
                icon: "ti-cloud-down",
                message: "Error: No response from API.<br>(loadStatsChart)",
            }, {
                type: 'danger',
                timer: 3000,
            });
        });
}

function loadDashboardData(walletAddress) {
    return $.ajax(API + 'pools/' + currentPool + '/miners/' + walletAddress)
        .done(function (data) {
            $('#pendingShares').text(_formatter(data.pendingShares, 0, ''));
            var workerHashRate = 0;
            $.each(data.performance.workers, function (index, value) {
                workerHashRate += value.hashrate;
            });
            $('#minerHashRate').text(_formatter(workerHashRate, 5, 'H/s'));
            $('#pendingBalance').text(_formatter(data.pendingBalance, 5, ''));
            $('#paidBalance').text(_formatter(data.totalPaid, 5, ''));
            $('#lifetimeBalance').text(_formatter(data.pendingBalance + data.totalPaid, 5, ''));
        })
        .fail(function () {
            $.notify({
                icon: "ti-cloud-down",
                message: "Error: No response from API.<br>(loadDashboardData)",
            }, {
                type: 'danger',
                timer: 3000,
            });
        });
}

function loadDashboardWorkerList(walletAddress) {
    return $.ajax(API + 'pools/' + currentPool + '/miners/' + walletAddress + '/performance')
        .done(function (data) {
            var workerList = '<thead><th>Name</th><th>Hash Rate</th><th>Share Rate</th></thead><tbody>';
            if (data.length > 0) {
                $.each(data[0].workers, function (index, value) {
                    workerList += '<tr>';
                    if (index.length === 0) {
                        workerList += '<td>Unnamed</td>';
                    } else {
                        workerList += '<td>' + index + '</td>';
                    }
                    workerList += '<td>' + _formatter(value.hashrate, 5, 'H/s') + '</td>';
                    workerList += '<td>' + _formatter(value.sharesPerSecond, 5, 'S/s') + '</td>';
                    workerList += '</tr>';
                });
            } else {
                workerList += '<tr><td colspan="3">None</td></tr>';
            }
            workerList += '</tbody>';
            $('#workerList').html(workerList);
        })
        .fail(function () {
            $.notify({
                icon: "ti-cloud-down",
                message: "Error: No response from API.<br>(loadDashboardWorkerList)",
            }, {
                type: 'danger',
                timer: 3000,
            });
        });
}

function loadDashboardChart(walletAddress) {
    return $.ajax(API + 'pools/' + currentPool + '/miners/' + walletAddress + '/performance')
        .done(function (data) {
            if (data.length > 0) {
                labels = [];
                minerHashRate = [];
                $.each(data, function (index, value) {
                    if (labels.length === 0 || (labels.length + 1) % 4 === 1) {
                        labels.push(new Date(value.created).toISOString().slice(11, 16));
                    } else {
                        labels.push('');
                    }
                    var workerHashRate = 0;
                    $.each(value.workers, function (index2, value2) {
                        workerHashRate += value2.hashrate;
                    });
                    minerHashRate.push(workerHashRate);
                });
                var data = {
                    labels: labels,
                    series: [
                        minerHashRate,
                    ],
                };
                var options = {
                    showArea: true,
                    height: "245px",
                    axisX: {
                        showGrid: false,
                    },
                    axisY: {
                        offset: 47,
                        labelInterpolationFnc: function(value) {
                            return _formatter(value, 1, '');
                        }
                    },
                    lineSmooth: Chartist.Interpolation.simple({
                        divisor: 2,
                    }),
                };
                var responsiveOptions = [
                    ['screen and (max-width: 640px)', {
                        axisX: {
                            labelInterpolationFnc: function (value) {
                                return value[0];
                            }
                        },
                    }],
                ];
                Chartist.Line('#chartDashboardHashRate', data, options, responsiveOptions);
            }
        })
        .fail(function () {
            $.notify({
                icon: "ti-cloud-down",
                message: "Error: No response from API.<br>(loadDashboardChart)",
            }, {
                type: 'danger',
                timer: 3000,
            });
        });
}

function loadMinersList() {
    return $.ajax(API + 'pools/' + currentPool + '/miners')
        .done(function (data) {
            var minerList = '<thead><tr><th>Address</th><th>Hash Rate</th><th>Share Rate</th></tr></thead><tbody>';
            if (data.length > 0) {
                $.each(data, function (index, value) {
                    minerList += '<tr>';
                    minerList += '<td>' + value.miner.substring(0, 12) + ' &hellip; ' + value.miner.substring(value.miner.length - 12) + '</td>';
                    minerList += '<td><a href="' + value.minerAddressInfoLink + '" target="_blank">' + value.miner.substring(0, 12) + ' &hellip; ' + value.miner.substring(value.miner.length - 12) + '</td>';
                    minerList += '<td>' + _formatter(value.hashrate, 5, 'H/s') + '</td>';
                    minerList += '<td>' + _formatter(value.sharesPerSecond, 5, 'S/s') + '</td>';
                    minerList += '</tr>';
                });
            } else {
                minerList += '<tr><td colspan="3">None</td></tr>';
            }
            minerList += '</tbody>';
            $('#minerList').html(minerList);
        })
        .fail(function () {
            $.notify({
                icon: "ti-cloud-down",
                message: "Error: No response from API.<br>(loadMinersList)",
            }, {
                type: 'danger',
                timer: 3000,
            });
        });
}

function loadBlocksList() {
    return $.ajax(API + 'pools/' + currentPool + '/blocks?pageSize=100')
        .done(function (data) {
            var blockList = '<thead><tr><th>Date &amp; Time</th><th>Height</th><th>Effort</th><th>Status</th><th>Reward</th><th>Confirmation</th></tr></thead><tbody>';
            if (data.length > 0) {
                $.each(data, function (index, value) {
                    blockList += '<tr>';
                    blockList += '<td>' + new Date(value.created).toLocaleString() + '</td>';
                    blockList += '<td>' + value.blockHeight + '</td>';
                    if (typeof(value.effort) !== "undefined") {
                        blockList += '<td>~' + Math.round(value.effort * 100) + '%</td>';
                    } else {
                        blockList += '<td>n/a</td>';
                    }
                    blockList += '<td>' + value.status + '</td>';
                    blockList += '<td>' + _formatter(value.reward, 5, '') + '</td>';
                    
                    // Confirmation column
                    var confirmationInfo = '';
                    if (value.confirmationProgress) {
                        confirmationInfo = '~' + Math.round(value.confirmationProgress * 100) + '%';
                    }
                    if (value.transactionConfirmationData && value.infoLink) {
                        if (confirmationInfo) confirmationInfo += '<br>';
                        confirmationInfo += '<a href="' + value.infoLink + '" target="_blank" title="' + value.transactionConfirmationData + '">' + 
                                          value.transactionConfirmationData.substring(0, 16) + '&hellip;' + 
                                          value.transactionConfirmationData.substring(value.transactionConfirmationData.length - 16) + '</a>';
                    }
                    blockList += '<td>' + (confirmationInfo || 'n/a') + '</td>';
                    blockList += '</tr>';
                });
            } else {
                blockList += '<tr><td colspan="6">None</td></tr>';
            }
            blockList += '</tbody>';
            $('#blockList').html(blockList);
        })
        .fail(function () {
            $.notify({
                icon: "ti-cloud-down",
                message: "Error: No response from API.<br>(loadBlocksList)",
            }, {
                type: 'danger',
                timer: 3000,
            });
        });
}

function loadPaymentsList() {
    return $.ajax(API + 'pools/' + currentPool + '/payments?pageSize=500')
        .done(function (data) {
            var paymentList = '<thead><tr><th>Date &amp; Time</th><th>Address</th><th>Amount</th><th>Transaction</th></tr></thead><tbody>';
            if (data.length > 0) {
                $.each(data, function (index, value) {
                    paymentList += '<tr>';
                    paymentList += '<td>' + new Date(value.created).toLocaleString() + '</td>';
                    
                    // Address column with link
                    var addressDisplay = value.address.substring(0, 12) + '&hellip;' + value.address.substring(value.address.length - 12);
                    if (value.addressInfoLink) {
                        paymentList += '<td><a href="' + value.addressInfoLink + '" target="_blank" title="' + value.address + '">' + addressDisplay + '</a></td>';
                    } else {
                        paymentList += '<td title="' + value.address + '">' + addressDisplay + '</td>';
                    }
                    
                    paymentList += '<td>' + _formatter(value.amount, 5, '') + '</td>';
                    
                    // Transaction column
                    var transactionInfo = '';
                    if (value.transactionConfirmationData && value.transactionInfoLink) {
                        transactionInfo = '<a href="' + value.transactionInfoLink + '" target="_blank" title="' + value.transactionConfirmationData + '">' + 
                                        value.transactionConfirmationData.substring(0, 16) + '&hellip;' + 
                                        value.transactionConfirmationData.substring(value.transactionConfirmationData.length - 16) + '</a>';
                    }
                    paymentList += '<td>' + (transactionInfo || 'n/a') + '</td>';
                    paymentList += '</tr>';
                });
            } else {
                paymentList += '<tr><td colspan="4">None</td></tr>';
            }
            paymentList += '</tbody>';
            $('#paymentList').html(paymentList);
        })
        .fail(function () {
            $.notify({
                icon: "ti-cloud-down",
                message: "Error: No response from API.<br>(loadPaymentsList)",
            }, {
                type: 'danger',
                timer: 3000,
            });
        });
}

function loadConnectConfig() {
    return $.ajax(API + 'pools')
        .done(function (data) {
            // Initialize configuration table strings for PPLNS and SOLO pools
            var connectPoolConfig = '<thead><tr><th>Item</th><th>Value</th></tr></thead><tbody>'; // PPLNS
            var connectPoolConfigSolo = '<thead><tr><th>Item</th><th>Value</th></tr></thead><tbody>'; // SOLO

            // Helper function to append pool specific rows
            function buildPoolConfig(pool) {
                var html = '';
                html += '<tr><td>Algorithm</td><td>' + pool.coin.algorithm + '</td></tr>';
                html += '<tr><td>Wallet Address</td><td><a href="' + pool.addressInfoLink + '" target="_blank">' + pool.address.substring(0, 12) + ' &hellip; ' + pool.address.substring(pool.address.length - 12) + '</a></td></tr>';
                html += '<tr><td>Payout Scheme</td><td>' + pool.paymentProcessing.payoutScheme + '</td></tr>';
                html += '<tr><td>Minimum Payment w/o #</td><td>' + pool.paymentProcessing.minimumPayment + '</td></tr>';
                if (typeof(pool.paymentProcessing.minimumPaymentToPaymentId) !== "undefined") {
                    html += '<tr><td>Minimum Payment w/ #</td><td>' + pool.paymentProcessing.minimumPaymentToPaymentId + '</td></tr>';
                }
                html += '<tr><td>Pool Fee</td><td>' + pool.poolFeePercent + '%</td></tr>';
                
                $.each(pool.ports, function (port, options) {
                    if (port == 10008) {
                        port = 9966;
                    }
                    if (port == 20008) {
                        port = 19966;
                    }
                    html += '<tr><td>Port ' + port + ' Difficulty</td><td>';
                    if (typeof(options.varDiff) !== "undefined") {
                        html += 'Variable / ' + options.varDiff.minDiff + ' &harr; ';
                        if (typeof(options.varDiff.maxDiff) === "undefined") {
                            html += '&infin;';
                        } else {
                            html += options.varDiff.maxDiff;
                        }
                    } else {
                        html += 'Static / ' + options.difficulty;
                    }
                    html += '</td></tr>';
                    html += '<tr><td>Stratum Address</td><td>stratum+tcp://poolv2.phicoin.net:' + port + '</td></tr>';
                });
                return html;
            }

            // Loop through pools and build respective configs
            $.each(data.pools, function (index, pool) {
                if (pool.id === 'PPLNS' || index === 0) { // treat first pool as PPLNS fallback
                    connectPoolConfig += buildPoolConfig(pool);
                } else if (pool.id === 'SOLO' || index === 1) { // treat second pool as SOLO fallback
                    connectPoolConfigSolo += buildPoolConfig(pool);
                }
            });

            connectPoolConfig += '</tbody>';
            connectPoolConfigSolo += '</tbody>';

            // Render to corresponding tables
            $('#connectPoolConfig').html(connectPoolConfig);
            $('#connectPoolConfigSolo').html(connectPoolConfigSolo);
        })
        .fail(function () {
            $.notify({
                icon: "ti-cloud-down",
                message: "Error: No response from API.<br>(loadConnectConfig)",
            }, {
                type: 'danger',
                timer: 3000,
            });
        });
}
