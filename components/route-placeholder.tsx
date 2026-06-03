type RoutePlaceholderProps = {
  text: string;
};

export function RoutePlaceholder({ text }: RoutePlaceholderProps) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <h1 className="text-3xl font-semibold tracking-normal">{text}</h1>
    </div>
  );
}
