import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { CopyInline } from "./CopyInline";


export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-slate-600 dark:text-slate-400">
            One toolkit for text, PDF, image, code and password work. Fast, free, and runs entirely in your browser — no uploads.
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Email:</span>
              <a href="mailto:prashantnadar2223@gmail.com" className="hover:text-blue-600">prashantnadar2223@gmail.com</a>
              <CopyInline value="prashantnadar2223@gmail.com" label="email" />
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Phone:</span>
              <a href="tel:+919653386506" className="hover:text-blue-600">+91 96533 86506</a>
              <CopyInline value="+91 96533 86506" label="phone number" />
            </p>
          </div>

        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Products</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/tools/text" className="text-slate-600 hover:text-blue-600 dark:text-slate-400">Text Tools</Link></li>
            <li><Link to="/tools/pdf" className="text-slate-600 hover:text-blue-600 dark:text-slate-400">PDF Tools</Link></li>
            <li><Link to="/tools/image" className="text-slate-600 hover:text-blue-600 dark:text-slate-400">Image Tools</Link></li>
            <li><Link to="/tools/code" className="text-slate-600 hover:text-blue-600 dark:text-slate-400">Code Tools</Link></li>
            <li><Link to="/tools/color" className="text-slate-600 hover:text-blue-600 dark:text-slate-400">Color Tools</Link></li>
            <li><Link to="/tools/password" className="text-slate-600 hover:text-blue-600 dark:text-slate-400">Password Tools</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Company</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/about" className="text-slate-600 hover:text-blue-600 dark:text-slate-400">About</Link></li>
            <li><Link to="/pricing" className="text-slate-600 hover:text-blue-600 dark:text-slate-400">Pricing</Link></li>
            <li><Link to="/why-choose-us" className="text-slate-600 hover:text-blue-600 dark:text-slate-400">Why choose us</Link></li>
            <li><Link to="/contact" className="text-slate-600 hover:text-blue-600 dark:text-slate-400">Contact</Link></li>
            <li><Link to="/privacy" className="text-slate-600 hover:text-blue-600 dark:text-slate-400">Privacy Policy</Link></li>
            <li><Link to="/terms" className="text-slate-600 hover:text-blue-600 dark:text-slate-400">Terms &amp; Conditions</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-500 dark:border-slate-800">
        <p>© {new Date().getFullYear()} UniversalTools. All rights reserved. · <Link to="/privacy" className="hover:text-blue-600">Privacy</Link> · <Link to="/terms" className="hover:text-blue-600">Terms</Link></p>
        <p className="mt-1">Made with ❤️ by <a href="https://www.instagram.com/prashant_Dev_22/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">Prashant Nadar</a></p>
      </div>
    </footer>
  );
}
