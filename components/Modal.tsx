import React from 'react';

interface ModalProps {
    imageUrl: string;
    onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ imageUrl, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-surface border border-surface-light p-4 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-end">
                    <button onClick={onClose} className="text-text-dark hover:text-text-light text-2xl">&times;</button>
                </div>
                <img src={imageUrl} alt="Payment Screenshot" className="w-full h-auto rounded"/>
            </div>
        </div>
    );
};

export default Modal;