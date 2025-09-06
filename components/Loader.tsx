import React from 'react';

export const Loader: React.FC = () => {
    const messages = [
        "Consulting with our virtual interior designer...",
        "Sketching out decoration concepts...",
        "Finding the perfect color palette...",
        "Generating stunning visuals...",
        "Building your shopping list...",
        "Directing a cinematic video of your space...",
        "This can take a minute, great things are worth the wait!",
        "Rendering the final animation...",
        "Finalizing your party plan..."
    ];
    const [message, setMessage] = React.useState(messages[0]);

    React.useEffect(() => {
        const intervalId = setInterval(() => {
            setMessage(prevMessage => {
                const currentIndex = messages.indexOf(prevMessage);
                const nextIndex = (currentIndex + 1) % messages.length;
                return messages[nextIndex];
            });
        }, 3000);

        return () => clearInterval(intervalId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg text-center flex flex-col justify-center items-center min-h-[500px]">
            <div className="relative h-24 w-24">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                <div className="absolute inset-0 rounded-full border-t-4 border-primary animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-text-primary mt-6">Generating Your Decor Plan</h3>
            <p className="text-text-secondary mt-2 transition-opacity duration-500">{message}</p>
        </div>
    );
};
