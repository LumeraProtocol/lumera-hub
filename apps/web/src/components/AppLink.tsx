import { ReactNode } from 'react';
import Link from 'next/link';

interface IAppLink {
  href: string;
  className?: string;
  target?: string;
  rel?: string;
  id?: string;
  children: ReactNode;
}

interface DynamicProps {
  [key: string]: string;
}

export default function AppLink({
  href,
  children,
  className = 'text-lumera-teal hover:text-lumera-green',
  target = '',
  rel = '',
  id = '',
}: IAppLink) {
  const props: DynamicProps = {};
  if (target) {
    props.target = target;
  }
  if (rel) {
    props.rel = rel;
  }
  return (
    <Link href={href} className={className} target={target} id={id}>
      {children}
    </Link>
  );
}
