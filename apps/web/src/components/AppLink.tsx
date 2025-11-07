import { ReactNode } from 'react';
import Link from 'next/link';

interface IAppLink {
    href: string;
    className?: string;
    target?: string;
    rel?: string;
    children: ReactNode;
}

interface DynamicProps {
  [key: string]: string;
}

export default function AppLink({
    href,
    children,
    className = '',
    target = '',
    rel = '',
}: IAppLink) {
    const props: DynamicProps = {};
    if (target) {
        props.target = target;
    }
    if (rel) {
        props.rel = rel;
    }
    return (
        <Link href={href} className={className} target={target}>
            {children}
        </Link>
    );
}