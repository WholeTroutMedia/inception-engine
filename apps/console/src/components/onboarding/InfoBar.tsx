import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Cloud, Sun, CloudRain, Cpu } from 'lucide-react';

export const InfoBar = () => {
    const [time, setTime] = useState(new Date());
    const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        // Attempt real geolocation via open-meteo
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    try {
                        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`);
                        const data = await res.json();
                        if (data.current) {
                            setWeather({ temp: Math.round(data.current.temperature_2m), code: data.current.weather_code });
                        }
                    } catch (e) {
                        console.error(e);
                        setWeather({ temp: 72, code: 0 });
                    }
                },
                () => {
                    setWeather({ temp: 72, code: 0 }); // Fallback on block
                }
            );
        } else {
            const timer = setTimeout(() => setWeather({ temp: 72, code: 0 }), 0);
            return () => clearTimeout(timer);
        }
    }, []);

    const getSystemInfo = () => {
        const isMac = /Mac/.test(navigator.userAgent);
        const isWin = /Win/.test(navigator.userAgent);
        const os = isMac ? 'macOS' : isWin ? 'Windows' : 'Linux';
        // @ts-expect-error fallback memory detection
        const memory = navigator.deviceMemory ? `${navigator.deviceMemory}GB RAM` : '32GB RAM';
        return `Workstation · ${memory} · ${os}`;
    };

    const WeatherIcon = weather?.code === 0 ? Sun : weather?.code && weather.code > 50 ? CloudRain : Cloud;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 px-6 py-3 rounded-full bg-secondary/80 backdrop-blur-xl border border-chalk-faint text-xs font-medium text-chalk-dim shadow-2xl z-20"
        >
            <div className="flex items-center gap-2">
                <span className="text-chalk w-16 tabular-nums">{format(time, 'HH:mm:ss')}</span>
                <span className="opacity-50">{format(time, 'MMM dd')}</span>
            </div>

            <div className="w-px h-4 bg-chalk-faint" />

            <div className="flex items-center gap-2 text-chalk">
                {weather ? (
                    <>
                        <motion.div
                            animate={{ y: [0, -2, 0] }}
                            transition={{ duration: 4, repeat: Infinity }}
                        >
                            <WeatherIcon size={14} className={weather.code === 0 ? "text-accent-3" : "text-chalk-dim"} />
                        </motion.div>
                        <span>{weather.temp}°</span>
                    </>
                ) : (
                    <span className="animate-pulse">Locating...</span>
                )}
            </div>

            <div className="w-px h-4 bg-chalk-faint" />

            <div className="flex items-center gap-2">
                <Cpu size={14} className="opacity-50" />
                <span>{getSystemInfo()}</span>
            </div>
        </motion.div>
    );
};
