const WelcomeScreen = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="w-16 h-16 mb-6 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
        <img src="/favicon-32x32.png" alt="Kotwal" width={32} height={32} />
      </div>
      <h1 className="text-2xl font-semibold text-foreground mb-2">How can I help you today?</h1>
    </div>
  );
};

export default WelcomeScreen;
