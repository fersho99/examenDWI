export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-x-8 gap-y-2 px-4 py-6 text-sm text-dust sm:px-6">
        <p>
          Datos de{" "}
          <a
            href="https://www.binance.com"
            target="_blank"
            rel="noreferrer"
            className="text-sand underline-offset-4 hover:underline"
          >
            Binance
          </a>
          ,{" "}
          <a
            href="https://www.coingecko.com"
            target="_blank"
            rel="noreferrer"
            className="text-sand underline-offset-4 hover:underline"
          >
            CoinGecko
          </a>{" "}
          y{" "}
          <a
            href="https://alternative.me/crypto/fear-and-greed-index/"
            target="_blank"
            rel="noreferrer"
            className="text-sand underline-offset-4 hover:underline"
          >
            Alternative.me
          </a>
          . Horario del centro de México.
        </p>
        <p>Proyecto académico. No es asesoría financiera.</p>
      </div>
    </footer>
  );
}
