import { useNavigate } from 'react-router-dom';

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="py-4 max-w-3xl mx-auto text-center">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-primary text-2xl font-bold">About Rhema</h1>
        <button className="btn-secondary !w-auto !py-2 !px-4 text-sm" onClick={() => navigate('/')}>
          ← Back
        </button>
      </div>

      <div className="bg-surface rounded-xl p-6 border border-[#2a2a2a] space-y-6 text-sm leading-relaxed text-muted text-left">
        <div>
          <h2 className="text-primary text-lg font-semibold mb-2">Our Mission</h2>
          <p className="text-text text-base">
            We're passionate about helping people of all ages and backgrounds explore the Bible in a way that's{' '}
            <strong className="text-primary">engaging</strong>,{' '}
            <strong className="text-primary">interactive</strong>, and{' '}
            <strong className="text-primary">fun</strong>!
          </p>
        </div>

        <div className="bg-primary/10 border border-primary/30 rounded-xl p-5 text-center">
          <p className="text-text italic">
            “Your word is a lamp to my feet and a light to my path.”
          </p>
          <p className="text-primary not-italic font-medium mt-2">— Psalm 119:105</p>
        </div>

        <div>
          <h3 className="text-primary text-lg font-semibold mb-2">What is Rhema?</h3>
          <p className="mb-2">
            Rhema is a free Bible quiz and reading platform. You can test your knowledge across all 66 books, read the Scripture, and challenge friends to real-time 1v1 duels.
          </p>
          <p>
            We believe that engaging with the Word should be accessible to everyone, everywhere. That’s why Rhema is built to be fast, lightweight, and work on any device.
          </p>
        </div>

        <div>
          <h3 className="text-primary text-lg font-semibold mb-2">How you can help</h3>
          <p>
            Rhema is a labour of love. If you'd like to support the mission, you can do so on the{' '}
            <span className="text-primary cursor-pointer underline" onClick={() => navigate('/donate')}>
              Donate page
            </span>.
          </p>
        </div>
      </div>
    </div>
  );
}