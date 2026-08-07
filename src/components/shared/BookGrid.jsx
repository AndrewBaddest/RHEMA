export default function BookGrid({ books, onClick }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 mt-4">
      {books.map((book) => (
        <div
          key={book}
          className="bg-surface border border-[#333] p-3.5 text-center rounded-xl cursor-pointer hover:border-primary hover:bg-[#282828] hover:-translate-y-1.5 hover:scale-[1.02] transition-all duration-200 shadow-sm hover:shadow-lg"
          onClick={() => onClick(book)}
        >
          {book}
        </div>
      ))}
    </div>
  );
}