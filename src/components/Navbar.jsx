import Link from "next/link";
import Logo from "./Logo";
import { FiLogIn } from "react-icons/fi";
import { LuUserPlus } from "react-icons/lu";

const Header = () => {
  return (
    <header className="w-full border-b border-[#fafafa1f] backdrop-blur-md sticky top-0 z-50 ">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-4 py-3">
        <Logo size={38} />

        <nav className="flex items-center gap-3">
          <Link
            href="/register"
            className="flex items-center gap-1 transition px-4 py-2 rounded-lg text-sm md:text-base  font-semibold shadow-sm hover:bg-[#1b1b1f] text-white"
          >
            <LuUserPlus size={16} />
            Register
          </Link>

          <Link
            href="/login"
            className="flex items-center gap-1 bg-[#39F3A6] hover:bg-[#2ad890] transition px-4 py-2 rounded-lg text-sm md:text-base text-[#09090b] font-semibold shadow-sm"
          >
            <FiLogIn size={16} />
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
