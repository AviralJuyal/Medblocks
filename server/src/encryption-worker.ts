import { parentPort } from 'worker_threads';

function simulateHeavyEncryption(data: any) {
    let result = 0;

    for (let i = 0; i < 1e10; i++) {
        result += i;
    }

    return {
        encrypted: `encrypted-${JSON.stringify(data)}`
    };
}

parentPort?.on('message', (vitals) => {
    const encrypted = simulateHeavyEncryption(vitals);

    parentPort?.postMessage(encrypted);
});