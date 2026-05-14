import { useEffect, useMemo, useState, memo } from 'react';
import io, { Socket } from 'socket.io-client';
import { FixedSizeList as List } from 'react-window';

interface PatientVitals {
    id: string;
    heartRate: number;
    bloodPressureSystolic: number;
    bloodPressureDiastolic: number;
    oxygenSaturation: number;
    respiratoryRate: number;
    temperature: number;
    timestamp: number;
}

const getVitalStatus = (vital: string, value: number): string => {
    switch (vital) {
        case 'heartRate':
            return value < 60 || value > 100
                ? 'text-red-600'
                : 'text-gray-800';

        case 'oxygenSaturation':
            return value < 95
                ? 'text-red-600'
                : 'text-gray-800';

        case 'bloodPressure':
            return value < 90 || value > 140
                ? 'text-red-600'
                : 'text-gray-800';

        case 'temperature':
            return value < 36.5 || value > 38
                ? 'text-red-600'
                : 'text-gray-800';

        default:
            return 'text-gray-800';
    }
};

// Memoized card prevents unnecessary re-renders
const PatientCard = memo(({ patient }: { patient: PatientVitals }) => {
    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500 m-2">
            <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-gray-900">
                    {patient.id}
                </h3>

                <span className="text-xs text-gray-500">
                    {new Date(patient.timestamp).toLocaleTimeString()}
                </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs text-gray-500 uppercase mb-1">
                        Heart Rate
                    </div>

                    <div className={`text-xl font-bold ${getVitalStatus('heartRate', patient.heartRate)}`}>
                        {patient.heartRate}
                    </div>
                </div>

                <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs text-gray-500 uppercase mb-1">
                        SpO₂
                    </div>

                    <div className={`text-xl font-bold ${getVitalStatus('oxygenSaturation', patient.oxygenSaturation)}`}>
                        {patient.oxygenSaturation}%
                    </div>
                </div>

                <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs text-gray-500 uppercase mb-1">
                        Temperature
                    </div>

                    <div className={`text-xl font-bold ${getVitalStatus('temperature', patient.temperature)}`}>
                        {patient.temperature.toFixed(1)}°C
                    </div>
                </div>
            </div>
        </div>
    );
});

export const Dashboard = () => {
    // Use Map for O(1) updates
    const [patientsMap, setPatientsMap] = useState<Map<string, PatientVitals>>(new Map());

    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const socket: Socket = io('http://localhost:3000');

        socket.on('connect', () => {
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        // Initial patients
        socket.on('initial_patients', (initialPatients: PatientVitals[]) => {
            const map = new Map<string, PatientVitals>();

            initialPatients.forEach(patient => {
                map.set(patient.id, patient);
            });

            setPatientsMap(map);
        });

        // Efficient updates
        socket.on('vitals_update', (updates: PatientVitals[]) => {
            setPatientsMap(prev => {
                const updated = new Map(prev);

                updates.forEach(patient => {
                    updated.set(patient.id, patient);
                });

                return updated;
            });
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    // Convert map to array only when needed
    const patients = useMemo(() => {
        return Array.from(patientsMap.values());
    }, [patientsMap]);

    // Virtualized row renderer
    const Row = ({ index, style }: any) => {
        const patient = patients[index];

        return (
            <div style={style}>
                <PatientCard patient={patient} />
            </div>
        );
    };

    return (
        <div className="bg-gray-100 p-6 min-h-screen">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-100 z-10 py-2">
                <h2 className="text-2xl font-bold text-gray-800">
                    ICU Live Monitor ({patients.length} Patients)
                </h2>

                <div className={`px-4 py-2 rounded-full text-sm font-bold shadow-sm ${isConnected
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                    {isConnected ? 'SYSTEM ONLINE' : 'DISCONNECTED'}
                </div>
            </div>

            {/* Virtualized rendering */}
            <List
                height={800}
                itemCount={patients.length}
                itemSize={180}
                width={'100%'}
            >
                {Row}
            </List>
        </div>
    );
};