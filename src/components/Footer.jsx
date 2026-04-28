import Link from "next/link";

const Footer = () => {
  return (
    <footer className="w-full border-t border-gray-800 py-6 text-center text-sm text-gray-400">
      <p className="font-medium tracking-wide">
        ©{new Date().getFullYear()} NextQuiz. All rights reserved.
      </p>

      <p className="mt-1">
        Built with ❤️ by{" "}
        <Link
          href="https://gautamkaran.in"
          target="_blank"
          rel="noopener noreferrer"
          className=" hover:text-green-400 font-semibold  underline transition-colors hover:underline"
        >
          GautamKaran
        </Link>
      </p>
    </footer>
  );
};

export default Footer;
