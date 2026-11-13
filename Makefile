PREFIX ?= $(HOME)/.local/bin

.PHONY: test lint install

test:
	sh test/run-tests.sh

lint:
	shellcheck --severity=warning git-kwdiff test/run-tests.sh install.sh

install:
	./install.sh $(PREFIX)
