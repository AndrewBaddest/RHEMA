export default function Contact() {
  return (
    <div className="py-2">
      <h2 className="text-primary text-2xl font-bold mb-4">Contact Us</h2>
      <p className="text-muted leading-relaxed mb-4">
        Have questions, feedback, or prayer requests? We'd love to hear from you!
      </p>
      <p className="text-xl mb-4">
        <a
          href="mailto:rhemabiblequiz@gmail.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-semibold hover:underline"
        >
          rhema.org
        </a>
      </p>
      <p className="text-muted">We typically respond within 24–48 hours.</p>
    </div>
  );
}