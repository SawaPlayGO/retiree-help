export default function MainLayout({ children }) {
    return (
        <div>
            <header>Header</header>
            <main>{children}</main>
            <footer>Footer</footer>
        </div>
    )
}