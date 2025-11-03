// Comprehensive Load Test for Exam Platform
// Tests both Python and SQL execution with detailed metrics

const NUM_CONCURRENT = 50; // Number of concurrent users
const API_URL = 'http://localhost:3000';

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatTime(ms) {
    return `${ms.toFixed(0)}ms`;
}

function formatPercentage(value) {
    return `${value.toFixed(1)}%`;
}

// Test Python execution
async function testPythonExecution(userId) {
    const startTime = Date.now();

    const testCodes = [
        `print('User ${userId} test')`,
        `for i in range(3):\n    print(f'User ${userId}: {i}')`,
        `import math\nprint('Pi:', math.pi)\nprint('User ${userId}')`,
        `x = ${userId}\ny = x * 2\nprint(f'Result: {y}')`,
        `data = [1, 2, 3, 4, 5]\nprint('Sum:', sum(data))\nprint('User ${userId}')`,
    ];

    const code = testCodes[userId % testCodes.length];

    try {
        const response = await fetch(`${API_URL}/api/run-python-docker`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: code,
                userEmail: `loadtest${userId}@test.com`
            })
        });

        const result = await response.json();
        const duration = Date.now() - startTime;

        return {
            userId,
            type: 'python',
            success: result.success && response.status === 200,
            duration,
            status: response.status,
            executionTime: result.executionTime,
            error: result.error || null,
        };
    } catch (error) {
        return {
            userId,
            type: 'python',
            success: false,
            duration: Date.now() - startTime,
            error: error.message,
        };
    }
}

// Test SQL execution
async function testSqlExecution(userId) {
    const startTime = Date.now();

    const testQueries = [
        `SELECT ${userId} as user_id, 'Test' as message`,
        `SELECT ${userId} * 2 as result, 'SQL Test' as type`,
        `SELECT '${userId}' as id, 100 + ${userId} as score`,
        `SELECT ${userId} as num, ${userId} * ${userId} as square`,
        `SELECT 'User' as type, ${userId} as id, 'Active' as status`,
    ];

    const query = testQueries[userId % testQueries.length];

    try {
        const response = await fetch(`${API_URL}/api/run-sql-docker`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: query,
                examId: 'load-test-exam',
                userEmail: `loadtest${userId}@test.com`
            })
        });

        const result = await response.json();
        const duration = Date.now() - startTime;

        return {
            userId,
            type: 'sql',
            success: !result.error && response.status === 200,
            duration,
            status: response.status,
            executionTime: result.executionTime,
            error: result.error || null,
        };
    } catch (error) {
        return {
            userId,
            type: 'sql',
            success: false,
            duration: Date.now() - startTime,
            error: error.message,
        };
    }
}

// Calculate statistics
function calculateStats(results, type) {
    const typeResults = results.filter(r => r.type === type);
    const successful = typeResults.filter(r => r.success);
    const failed = typeResults.filter(r => !r.success);

    const durations = typeResults.map(r => r.duration);
    const executionTimes = successful
        .filter(r => r.executionTime)
        .map(r => r.executionTime);

    const avgDuration = durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

    const avgExecution = executionTimes.length > 0
        ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
        : 0;

    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const successRate = (successful.length / typeResults.length) * 100;

    // Calculate percentiles
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const p50 = sortedDurations[Math.floor(sortedDurations.length * 0.5)];
    const p95 = sortedDurations[Math.floor(sortedDurations.length * 0.95)];
    const p99 = sortedDurations[Math.floor(sortedDurations.length * 0.99)];

    return {
        total: typeResults.length,
        successful: successful.length,
        failed: failed.length,
        successRate,
        avgDuration,
        avgExecution,
        minDuration,
        maxDuration,
        p50,
        p95,
        p99,
        errors: failed.map(r => ({ userId: r.userId, error: r.error })),
    };
}

// Print results table
function printResults(stats, type) {
    const icon = type === 'python' ? '🐍' : '🔷';
    const color = stats.successRate >= 95 ? 'green' : stats.successRate >= 80 ? 'yellow' : 'red';

    log(`\n${icon} ${type.toUpperCase()} RESULTS:`, 'bright');
    log('─'.repeat(60), 'cyan');

    log(`  Total Requests:      ${stats.total}`);
    log(`  Successful:          ${stats.successful} (${formatPercentage(stats.successRate)})`,
        stats.successRate >= 95 ? 'green' : 'yellow');
    log(`  Failed:              ${stats.failed}`, stats.failed > 0 ? 'red' : 'green');
    log('');
    log(`  Response Times:`, 'cyan');
    log(`    Average:           ${formatTime(stats.avgDuration)}`);
    log(`    Minimum:           ${formatTime(stats.minDuration)}`);
    log(`    Maximum:           ${formatTime(stats.maxDuration)}`);
    log(`    50th percentile:   ${formatTime(stats.p50)}`);
    log(`    95th percentile:   ${formatTime(stats.p95)}`);
    log(`    99th percentile:   ${formatTime(stats.p99)}`);
    log('');
    log(`  Execution Times:`, 'cyan');
    log(`    Average:           ${formatTime(stats.avgExecution)}`);

    if (stats.failed > 0) {
        log('\n  Failed Requests:', 'red');
        stats.errors.slice(0, 5).forEach(err => {
            log(`    User ${err.userId}: ${err.error}`, 'red');
        });
        if (stats.errors.length > 5) {
            log(`    ... and ${stats.errors.length - 5} more`, 'red');
        }
    }

    log('─'.repeat(60), 'cyan');
}

// Print progress bar
function printProgress(current, total, type) {
    const percentage = (current / total) * 100;
    const filled = Math.floor(percentage / 2);
    const empty = 50 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const icon = type === 'python' ? '🐍' : '🔷';

    process.stdout.write(`\r${icon} ${type}: [${bar}] ${percentage.toFixed(0)}% (${current}/${total})`);

    if (current === total) {
        console.log(''); // New line when complete
    }
}

// Main load test function
async function runLoadTest() {
    console.clear();
    log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
    log('║          EXAM PLATFORM LOAD TEST                          ║', 'bright');
    log('╚════════════════════════════════════════════════════════════╝', 'cyan');

    log(`\n📊 Test Configuration:`, 'magenta');
    log(`   • Concurrent Users: ${NUM_CONCURRENT}`, 'magenta');
    log(`   • API Endpoint: ${API_URL}`, 'magenta');
    log(`   • Test Types: Python & SQL`, 'magenta');

    log(`\n🚀 Starting load test...\n`, 'yellow');

    // Check if server is running
    try {
        const healthCheck = await fetch(`${API_URL}/api/admin/queue-stats`);
        if (!healthCheck.ok) {
            throw new Error('Server not responding');
        }
        log('✅ Server health check passed\n', 'green');
    } catch (error) {
        log('❌ ERROR: Cannot connect to server!', 'red');
        log('   Make sure your dev server is running: npm run dev', 'red');
        process.exit(1);
    }

    // Test 1: Python Execution
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log('TEST 1: Python Code Execution', 'bright');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

    const pythonPromises = [];
    const pythonResults = [];

    const pythonStartTime = Date.now();

    for (let i = 0; i < NUM_CONCURRENT; i++) {
        pythonPromises.push(
            testPythonExecution(i).then(result => {
                pythonResults.push(result);
                printProgress(pythonResults.length, NUM_CONCURRENT, 'Python');
                return result;
            })
        );
    }

    await Promise.all(pythonPromises);
    const pythonDuration = Date.now() - pythonStartTime;

    const pythonStats = calculateStats(pythonResults, 'python');
    printResults(pythonStats, 'python');
    log(`  Total Test Duration: ${formatTime(pythonDuration)}\n`, 'cyan');

    // Wait between tests
    log('⏳ Waiting 5 seconds before SQL test...\n', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test 2: SQL Execution
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log('TEST 2: SQL Query Execution', 'bright');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

    const sqlPromises = [];
    const sqlResults = [];

    const sqlStartTime = Date.now();

    for (let i = 0; i < NUM_CONCURRENT; i++) {
        sqlPromises.push(
            testSqlExecution(i).then(result => {
                sqlResults.push(result);
                printProgress(sqlResults.length, NUM_CONCURRENT, 'SQL');
                return result;
            })
        );
    }

    await Promise.all(sqlPromises);
    const sqlDuration = Date.now() - sqlStartTime;

    const sqlStats = calculateStats(sqlResults, 'sql');
    printResults(sqlStats, 'sql');
    log(`  Total Test Duration: ${formatTime(sqlDuration)}\n`, 'cyan');

    // Overall Summary
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log('OVERALL SUMMARY', 'bright');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

    const totalRequests = NUM_CONCURRENT * 2;
    const totalSuccessful = pythonStats.successful + sqlStats.successful;
    const totalFailed = pythonStats.failed + sqlStats.failed;
    const overallSuccessRate = (totalSuccessful / totalRequests) * 100;
    const totalDuration = pythonDuration + sqlDuration + 5000; // Include wait time

    log(`\n  Total Requests:        ${totalRequests}`);
    log(`  Total Successful:      ${totalSuccessful} (${formatPercentage(overallSuccessRate)})`,
        overallSuccessRate >= 95 ? 'green' : 'yellow');
    log(`  Total Failed:          ${totalFailed}`, totalFailed === 0 ? 'green' : 'red');
    log(`  Total Test Time:       ${formatTime(totalDuration)}`);
    log(`  Avg Response Time:     ${formatTime((pythonStats.avgDuration + sqlStats.avgDuration) / 2)}`);
    log('');

    // Verdict
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log('VERDICT', 'bright');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

    if (overallSuccessRate >= 98) {
        log('\n🎉 EXCELLENT! Your system can easily handle 50+ concurrent users!', 'green');
        log('   • Success rate: >98%', 'green');
        log('   • System is production-ready', 'green');
        log('   • Can scale to 100+ users with current setup', 'green');
    } else if (overallSuccessRate >= 90) {
        log('\n✅ GOOD! Your system handles load well.', 'yellow');
        log('   • Success rate: 90-98%', 'yellow');
        log('   • Consider tuning concurrent limits for 100+ users', 'yellow');
        log('   • Monitor queue lengths during peak usage', 'yellow');
    } else if (overallSuccessRate >= 80) {
        log('\n⚠️  ACCEPTABLE but needs optimization.', 'yellow');
        log('   • Success rate: 80-90%', 'yellow');
        log('   • Increase MAX_CONCURRENT in queueManager.ts', 'yellow');
        log('   • Add more CPU/RAM resources', 'yellow');
    } else {
        log('\n🚨 NEEDS IMPROVEMENT! System is overloaded.', 'red');
        log('   • Success rate: <80%', 'red');
        log('   • Increase concurrent execution limits', 'red');
        log('   • Consider horizontal scaling', 'red');
        log('   • Check server resources (CPU, RAM, Docker)', 'red');
    }

    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

    // Recommendations
    if (pythonStats.failed > 0 || sqlStats.failed > 0) {
        log('💡 RECOMMENDATIONS:', 'magenta');

        if (pythonStats.avgDuration > 5000) {
            log('   • Python responses are slow (>5s) - increase timeout or optimize code', 'magenta');
        }

        if (sqlStats.avgDuration > 3000) {
            log('   • SQL responses are slow (>3s) - check database performance', 'magenta');
        }

        if (pythonStats.failed > 5) {
            log('   • Many Python failures - check Docker container limits', 'magenta');
        }

        if (sqlStats.failed > 5) {
            log('   • Many SQL failures - check database connection pool', 'magenta');
        }

        log('\n   Check the admin dashboard for real-time queue statistics:', 'magenta');
        log(`   ${API_URL}/admin/queue-monitor\n`, 'cyan');
    }

    log('✨ Load test complete!\n', 'bright');
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
    log('\n❌ Unhandled error:', 'red');
    console.error(error);
    process.exit(1);
});

// Run the test
runLoadTest().catch(error => {
    log('\n❌ Load test failed:', 'red');
    console.error(error);
    process.exit(1);
});